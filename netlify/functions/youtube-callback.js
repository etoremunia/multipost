// netlify/functions/youtube-callback.js
// Google redirige aquí después de que el usuario autoriza

exports.handler = async (event) => {
  const { code, state, error } = event.queryStringParameters || {};

  if (error) {
    return redirect(`/?youtube_error=acceso_denegado`);
  }

  if (!code || !state) {
    return redirect(`/?youtube_error=parametros_invalidos`);
  }

  // Decodificar el estado para obtener el email
  let userEmail;
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
    userEmail = decoded.email;
  } catch (e) {
    return redirect(`/?youtube_error=estado_invalido`);
  }

  // Intercambiar el código por tokens
  let tokens;
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.YOUTUBE_CLIENT_ID,
        client_secret: process.env.YOUTUBE_CLIENT_SECRET,
        redirect_uri: process.env.YOUTUBE_REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    });
    tokens = await tokenRes.json();
  } catch (e) {
    return redirect(`/?youtube_error=token_fallido`);
  }

  if (!tokens.access_token) {
    return redirect(`/?youtube_error=token_vacio`);
  }

  // Guardar tokens en Supabase
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
        platform: 'youtube',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        expires_at: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null,
        updated_at: new Date().toISOString()
      })
    });
  } catch (e) {
    return redirect(`/?youtube_error=guardado_fallido`);
  }

  // Redirigir de vuelta al dashboard con éxito
  return redirect(`/?youtube_connected=1&email=${encodeURIComponent(userEmail)}`);
};

function redirect(url) {
  return {
    statusCode: 302,
    headers: { Location: url },
    body: ''
  };
}
