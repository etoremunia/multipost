// netlify/functions/tiktok-callback.js
// TikTok redirige aquí después de que el usuario autoriza

exports.handler = async (event) => {
  const { code, state, error } = event.queryStringParameters || {};

  if (error) return redirect('/?tiktok_error=acceso_denegado');
  if (!code || !state) return redirect('/?tiktok_error=parametros_invalidos');

  let userEmail;
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
    userEmail = decoded.email;
  } catch (e) {
    return redirect('/?tiktok_error=estado_invalido');
  }

  // Intercambiar código por token
  let tokens;
  try {
    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY,
        client_secret: process.env.TIKTOK_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.TIKTOK_REDIRECT_URI
      })
    });
    tokens = await tokenRes.json();
  } catch (e) {
    return redirect('/?tiktok_error=token_fallido');
  }

  if (!tokens.access_token) {
    return redirect('/?tiktok_error=token_vacio');
  }

  // Guardar en Supabase
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

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
        expires_at: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null,
        updated_at: new Date().toISOString()
      })
    });
  } catch (e) {
    return redirect('/?tiktok_error=guardado_fallido');
  }

  return redirect(`/?tiktok_connected=1&email=${encodeURIComponent(userEmail)}`);
};

function redirect(url) {
  return { statusCode: 302, headers: { Location: url }, body: '' };
}
