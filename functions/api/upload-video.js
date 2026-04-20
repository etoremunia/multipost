export async function onRequestPost(context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    const formData = await context.request.formData();
    const email = formData.get('email');
    const title = formData.get('title') || 'Video sin título';
    const description = formData.get('description') || '';
    const platformsRaw = formData.get('platforms');
    const videoFile = formData.get('video');

    if (!email || !videoFile || !platformsRaw) {
      return new Response(JSON.stringify({ error: 'Faltan campos requeridos' }), { status: 400, headers });
    }

    const platforms = JSON.parse(platformsRaw).map(p => p.toLowerCase());
    const supabaseUrl = context.env.SUPABASE_URL;
    const supabaseKey = context.env.SUPABASE_ANON_KEY;

    // Obtener tokens de Supabase
    const tokensRes = await fetch(
      `${supabaseUrl}/rest/v1/platform_tokens?user_email=eq.${encodeURIComponent(email)}&select=platform,access_token,refresh_token`,
      { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } }
    );
    const tokens = await tokensRes.json();

    const results = {};
    const videoBytes = await videoFile.arrayBuffer();

    // ── YOUTUBE ──
    if (platforms.includes('youtube')) {
      const ytToken = tokens.find(t => t.platform === 'youtube');
      if (!ytToken) {
        results.youtube = { ok: false, error: 'No hay cuenta de YouTube conectada' };
      } else {
        try {
          // Refrescar token si es necesario
          let accessToken = ytToken.access_token;
          if (ytToken.refresh_token) {
            const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                client_id: context.env.YOUTUBE_CLIENT_ID,
                client_secret: context.env.YOUTUBE_CLIENT_SECRET,
                refresh_token: ytToken.refresh_token,
                grant_type: 'refresh_token'
              })
            });
            const refreshData = await refreshRes.json();
            if (refreshData.access_token) {
              accessToken = refreshData.access_token;
              // Actualizar token en Supabase
              await fetch(
                `${supabaseUrl}/rest/v1/platform_tokens?user_email=eq.${encodeURIComponent(email)}&platform=eq.youtube`,
                {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`
                  },
                  body: JSON.stringify({ access_token: accessToken, updated_at: new Date().toISOString() })
                }
              );
            }
          }

          // Paso 1: Iniciar subida resumable
          const initRes = await fetch(
            'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Upload-Content-Type': videoFile.type || 'video/mp4',
                'X-Upload-Content-Length': videoBytes.byteLength
              },
              body: JSON.stringify({
                snippet: {
                  title: title,
                  description: description,
                  categoryId: '22'
                },
                status: {
                  privacyStatus: 'public'
                }
              })
            }
          );

          if (!initRes.ok) {
            const errText = await initRes.text();
            results.youtube = { ok: false, error: 'Error al iniciar subida: ' + errText };
          } else {
            const uploadUrl = initRes.headers.get('Location');

            // Paso 2: Subir el video
            const uploadRes = await fetch(uploadUrl, {
              method: 'PUT',
              headers: {
                'Content-Type': videoFile.type || 'video/mp4',
                'Content-Length': videoBytes.byteLength
              },
              body: videoBytes
            });

            if (uploadRes.ok || uploadRes.status === 201) {
              const videoData = await uploadRes.json();
              results.youtube = { ok: true, videoId: videoData.id };
            } else {
              const errText = await uploadRes.text();
              results.youtube = { ok: false, error: 'Error al subir video: ' + errText };
            }
          }
        } catch (e) {
          results.youtube = { ok: false, error: e.message };
        }
      }
    }

    // ── TIKTOK ──
    if (platforms.includes('tiktok')) {
      const ttToken = tokens.find(t => t.platform === 'tiktok');
      if (!ttToken) {
        results.tiktok = { ok: false, error: 'No hay cuenta de TikTok conectada' };
      } else {
        try {
          // Iniciar subida a TikTok
          const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/inbox/video/init/', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${ttToken.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              source_info: {
                source: 'FILE_UPLOAD',
                video_size: videoBytes.byteLength,
                chunk_size: videoBytes.byteLength,
                total_chunk_count: 1
              }
            })
          });
          const initData = await initRes.json();

          if (initData.data && initData.data.upload_url) {
            const uploadRes = await fetch(initData.data.upload_url, {
              method: 'PUT',
              headers: {
                'Content-Type': 'video/mp4',
                'Content-Length': videoBytes.byteLength,
                'Content-Range': `bytes 0-${videoBytes.byteLength - 1}/${videoBytes.byteLength}`
              },
              body: videoBytes
            });
            results.tiktok = uploadRes.ok
              ? { ok: true, publishId: initData.data.publish_id }
              : { ok: false, error: 'Error al subir a TikTok' };
          } else {
            results.tiktok = { ok: false, error: initData.error?.message || 'Error al iniciar subida TikTok' };
          }
        } catch (e) {
          results.tiktok = { ok: false, error: e.message };
        }
      }
    }

    // ── INSTAGRAM ──
    if (platforms.includes('instagram')) {
      results.instagram = { ok: false, error: 'Subida directa a Instagram requiere URL pública del video. Próximamente.' };
    }

    // Comprobar si al menos una plataforma tuvo éxito
    const anySuccess = Object.values(results).some(r => r.ok);
    if (!anySuccess) {
      const errors = Object.entries(results).map(([p, r]) => `${p}: ${r.error}`).join(', ');
      return new Response(JSON.stringify({ error: errors }), { status: 500, headers });
    }

    return new Response(JSON.stringify({ ok: true, results }), { status: 200, headers });

  } catch (e) {
    return new Response(JSON.stringify({ error: 'Error interno: ' + e.message }), { status: 500, headers });
  }
}

export async function onRequestOptions() {
  return new Response('', {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    }
  });
}
