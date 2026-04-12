// netlify/functions/youtube-auth.js
// Redirige al usuario a la página de autorización de Google

exports.handler = async (event) => {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI;

  // Recibimos el email del usuario para asociar la cuenta
  const userEmail = event.queryStringParameters && event.queryStringParameters.email;
  if (!userEmail) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Email requerido' })
    };
  }

  const scopes = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube'
  ].join(' ');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes,
    access_type: 'offline',
    prompt: 'consent',
    state: Buffer.from(JSON.stringify({ email: userEmail })).toString('base64')
  });

  const authUrl = `https://accounts.google.com/o/oauth2/auth?${params.toString()}`;

  return {
    statusCode: 302,
    headers: { Location: authUrl },
    body: ''
  };
};
