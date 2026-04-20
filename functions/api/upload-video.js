export async function onRequestPost(context) {
  const json = (data, status = 200) => new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });

  try {
    const formData = await context.request.formData();
    const file = formData.get('video');
    const email = formData.get('email');
    const title = formData.get('title') || 'Video sin título';
    const description = formData.get('description') || '';

    if (!file || !email) return json({ error: 'Faltan datos' }, 400);

    // 1. Subir a R2
    const fileName = `${Date.now()}-${file.name}`;
    const r2Endpoint = context.env.R2_ENDPOINT;
    const bucket = context.env.R2_BUCKET;
    const accessKey = context.env.R2_ACCESS_KEY_ID;
    const secretKey = context.env.R2_SECRET_ACCESS_KEY;

    const uploadUrl = `${r2Endpoint}/${bucket}/${fileName}`;
    const fileBuffer = await file.arrayBuffer();

    // Firma AWS S3 compatible para R2
    const uploadRes = await fetchWithAwsAuth(
      uploadUrl, 'PUT', fileBuffer, file.type,
      accessKey, secretKey, bucket, fileName
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      return json({ error: 'Error subiendo a R2: ' + uploadRes.status + ' - ' + errText }, 500);
    }

    // 2. Obtener token de YouTube desde Supabase
    const supabaseUrl = context.env.SUPABASE_URL;
    const supabaseKey = context.env.SUPABASE_ANON_KEY;

    const tokenRes = await fetch(
      `${supabaseUrl}/rest/v1/platform_tokens?user_email=eq.${encodeURIComponent(email)}&platform=eq.youtube&select=access_token`,
      { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } }
    );
    const tokens = await tokenRes.json();
    if (!tokens.length) return json({ error: 'YouTube no conectado' }, 400);
    const accessToken = tokens[0].access_token;

    // 3. Publicar en YouTube (resumable upload)
    const metaRes = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': file.type,
        'X-Upload-Content-Length': fileBuffer.byteLength
      },
      body: JSON.stringify({
        snippet: { title, description, categoryId: '22' },
        status: { privacyStatus: 'public' }
      })
    });

    if (!metaRes.ok) {
      const err = await metaRes.text();
      return json({ error: 'Error iniciando upload YouTube: ' + err }, 500);
    }

    const uploadLocation = metaRes.headers.get('Location');
    if (!uploadLocation) return json({ error: 'No se obtuvo URL de upload de YouTube' }, 500);

    // 4. Subir el video a YouTube
    const ytRes = await fetch(uploadLocation, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
        'Content-Length': fileBuffer.byteLength
      },
      body: fileBuffer
    });

    if (!ytRes.ok) {
      const err = await ytRes.text();
      return json({ error: 'Error subiendo video a YouTube: ' + err }, 500);
    }

    const ytData = await ytRes.json();

    // 5. Guardar en historial Supabase
    await fetch(`${supabaseUrl}/rest/v1/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        user_email: email,
        filename: file.name,
        title,
        description,
        platforms: ['youtube'],
        status: 'published'
      })
    });

    return json({ ok: true, youtube_id: ytData.id });

  } catch (e) {
    return json({ error: 'Error interno: ' + e.message + ' | stack: ' + (e.stack || 'none') }, 500);
  }
}

// AWS Signature V4 para R2
async function fetchWithAwsAuth(url, method, body, contentType, accessKey, secretKey, bucket, key) {
  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const region = 'auto';
  const service = 's3';

  const bodyHash = await sha256Hex(body);

  const canonicalHeaders = `content-type:${contentType}\nhost:${new URL(url).host}\nx-amz-content-sha256:${bodyHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = `${method}\n/${bucket}/${key}\n\n${canonicalHeaders}\n${signedHeaders}\n${bodyHash}`;

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${await sha256Hex(canonicalRequest)}`;

  const signingKey = await getSigningKey(secretKey, dateStamp, region, service);
  const signature = await hmacHex(signingKey, stringToSign);

  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return fetch(url, {
    method,
    headers: {
      'Content-Type': contentType,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': bodyHash,
      'Authorization': authHeader
    },
    body
  });
}

async function sha256Hex(data) {
  const buf = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const hash = await crypto.subtle.digest('SHA-256', buf instanceof ArrayBuffer ? buf : buf.buffer || buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacHex(key, message) {
  const msgBuf = new TextEncoder().encode(message);
  const sig = await crypto.subtle.sign('HMAC', key, msgBuf);
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getSigningKey(secretKey, dateStamp, region, service) {
  const enc = new TextEncoder();
  const kDate = await crypto.subtle.importKey('raw', enc.encode('AWS4' + secretKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const kDateSig = await crypto.subtle.sign('HMAC', kDate, enc.encode(dateStamp));
  const kRegion = await crypto.subtle.importKey('raw', kDateSig, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const kRegionSig = await crypto.subtle.sign('HMAC', kRegion, enc.encode(region));
  const kService = await crypto.subtle.importKey('raw', kRegionSig, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const kServiceSig = await crypto.subtle.sign('HMAC', kService, enc.encode(service));
  const kSigning = await crypto.subtle.importKey('raw', kServiceSig, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return kSigning;
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
