// netlify/functions/tiktok-auth.js
// Redirige al usuario a la página de autorización de TikTok

exports.handler = async (event) => {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI;

  const userEmail = event.queryStringParameters && event.queryStringParameters.email;
  if (!userEmail) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Email requerido' }) };
  }

  if (!clientKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'TikTok no configurado aún' }) };
  }

const scopes = 'user.info.basic,video.upload';
  
  const state = Buffer.from(JSON.stringify({ email: userEmail })).toString('base64');

  const params = new URLSearchParams({
    client_key: clientKey,
    scope: scopes,
    response_type: 'code',
    redirect_uri: redirectUri,
    state: state
  });

  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;

  return {
    statusCode: 302,
    headers: { Location: authUrl },
    body: ''
  };
};
