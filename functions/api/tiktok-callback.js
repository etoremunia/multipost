export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const json = (data, status=200) => new Response(JSON.stringify(data), {
    status, headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}
  });

  if (error) return json({error: 'acceso_denegado'});
  if (!code || !state) return json({error: 'parametros_invalidos'});

  let userEmail;
  try {
    const decoded = JSON.parse(atob(state));
    userEmail = decoded.email;
  } catch (e) {
    return json({error: 'estado_invalido'});
  }

  let tokens;
  try {
    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: context.env.TIKTOK_CLIENT_KEY,
        client_secret: context.env.TIKTOK_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: context.env.TIKTOK_REDIRECT_URI
      })
    });
    tokens = await tokenRes.json();
  } catch (e) {
    return json({error: 'token_fallido'});
  }

  if (!tokens.access_token) return json({error: 'token_vacio'});

  try {
    const supabaseUrl = context.env.SUPABASE_URL;
    const supabaseKey = context.env.SUPABASE_ANON_KEY;
    await fetch(`${supabaseUrl}/rest/v1/platform_tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        user_email: userEmail,
        platform: 'tiktok',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        expires_at: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
        updated_at: new Date().toISOString()
      })
    });
  } catch (e) {
    return json({error: 'guardado_fallido'});
  }

  return json({ok: true, email: userEmail});
}
