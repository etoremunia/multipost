export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) return Response.redirect('/?instagram_error=acceso_denegado', 302);
  if (!code || !state) return Response.redirect('/?instagram_error=parametros_invalidos', 302);

  let userEmail;
  try {
    const decoded = JSON.parse(atob(state));
    userEmail = decoded.email;
  } catch (e) {
    return Response.redirect('/?instagram_error=estado_invalido', 302);
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
        code: code,
        grant_type: 'authorization_code'
      })
    });
    shortToken = await tokenRes.json();
  } catch (e) {
    return Response.redirect('/?instagram_error=token_fallido', 302);
  }

  if (!shortToken.access_token) return Response.redirect('/?instagram_error=token_vacio', 302);

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
    return Response.redirect('/?instagram_error=guardado_fallido', 302);
  }

  return Response.redirect(`/?instagram_connected=1&email=${encodeURIComponent(userEmail)}`, 302);
}
