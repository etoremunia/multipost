// netlify/functions/instagram-callback.js
// Meta redirige aquí después de que el usuario autoriza Instagram

exports.handler = async (event) => {
  const { code, state, error } = event.queryStringParameters || {};

  if (error) return redirect('/?instagram_error=acceso_denegado');
  if (!code || !state) return redirect('/?instagram_error=parametros_invalidos');

  let userEmail;
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
    userEmail = decoded.email;
  } catch (e) {
    return redirect('/?instagram_error=estado_invalido');
  }

  // Intercambiar código por token de acceso de corta duración
  let shortToken;
  try {
    const tokenRes = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.INSTAGRAM_CLIENT_ID,
        client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
        redirect_uri: process.env.INSTAGRAM_REDIRECT_URI,
        code: code
      })
    });
    shortToken = await tokenRes.json();
  } catch (e) {
    return redirect('/?instagram_error=token_fallido');
  }

  if (!shortToken.access_token) {
    return redirect('/?instagram_error=token_vacio');
  }

  // Intercambiar por token de larga duración (60 días)
  let longToken;
  try {
    const longRes = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.INSTAGRAM_CLIENT_ID}&client_secret=${process.env.INSTAGRAM_CLIENT_SECRET}&fb_exchange_token=${shortToken.access_token}`
    );
    longToken = await longRes.json();
  } catch (e) {
    longToken = shortToken; // fallback al token corto si falla
  }

  const accessToken = longToken.access_token || shortToken.access_token;
  const expiresIn = longToken.expires_in || shortToken.expires_in || 3600;

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
        platform: 'instagram',
        access_token: accessToken,
        refresh_token: null,
        expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
    });
  } catch (e) {
    return redirect('/?instagram_error=guardado_fallido');
  }

  return redirect(`/?instagram_connected=1&email=${encodeURIComponent(userEmail)}`);
};

function redirect(url) {
  return { statusCode: 302, headers: { Location: url }, body: '' };
}
