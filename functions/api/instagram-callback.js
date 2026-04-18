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

  let shortToken;
  try {
    const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: context.env.INSTAGRAM_CLIENT_ID,
        client_secret: context.env.INSTAGRAM_CLIENT_SECRET,
        redirect_uri: context.env.INSTAGRAM_REDIRECT_URI,
        code,
        grant_type: 'authorization_code'
      })
    });
    shortToken = await tokenRes.json();
  } catch (e) {
    return json({error: 'token_fallido'});
  }

  if (!shortToken.access_token) return json({error: 'token_vacio'});

  let longToken;
  try {
    const longRes = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${context.env.INSTAGRAM_CLIENT_SECRET}&access_token=${shortToken.access_token}`
    );
    longToken = await longRes.json();
  } catch (e) {
    longToken = shortToken;
  }

  const accessToken = longToken.access_token || shortToken.access_token;
  const expiresIn = longToken.expires_in || shortToken.expires_in || 3600;

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
        platform: 'instagram',
        access_token: accessToken,
        refresh_token: null,
        expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
    });
  } catch (e) {
    return json({error: 'guardado_fallido'});
  }

  return json({ok: true, email: userEmail});
}
