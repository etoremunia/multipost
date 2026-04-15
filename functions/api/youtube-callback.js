export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) return Response.redirect('/?youtube_error=acceso_denegado', 302);
  if (!code || !state) return Response.redirect('/?youtube_error=parametros_invalidos', 302);

  let userEmail;
  try {
    const decoded = JSON.parse(atob(state));
    userEmail = decoded.email;
  } catch (e) {
    return Response.redirect('/?youtube_error=estado_invalido', 302);
  }

  let tokens;
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: context.env.YOUTUBE_CLIENT_ID,
        client_secret: context.env.YOUTUBE_CLIENT_SECRET,
        redirect_uri: context.env.YOUTUBE_REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    });
    tokens = await tokenRes.json();
  } catch (e) {
    return Response.redirect('/?youtube_error=token_fallido', 302);
  }

  if (!tokens.access_token) return Response.redirect('/?youtube_error=token_vacio', 302);

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
        platform: 'youtube',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        expires_at: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
        updated_at: new Date().toISOString()
      })
    });
  } catch (e) {
    return Response.redirect('/?youtube_error=guardado_fallido', 302);
  }

  return Response.redirect(`/?youtube_connected=1&email=${encodeURIComponent(userEmail)}`, 302);
}
