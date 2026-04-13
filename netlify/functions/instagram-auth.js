// netlify/functions/instagram-auth.js
exports.handler = async (event) => {
  const clientId = process.env.INSTAGRAM_CLIENT_ID;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;
  const userEmail = event.queryStringParameters && event.queryStringParameters.email;

  if (!userEmail) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Email requerido' }) };
  }
  if (!clientId) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Instagram no configurado aún' }) };
  }

  const scopes = [
    'instagram_business_basic',
    'instagram_business_content_publish',
    'instagram_business_manage_messages',
    'instagram_business_manage_comments'
  ].join(',');

  const state = Buffer.from(JSON.stringify({ email: userEmail })).toString('base64');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    response_type: 'code',
    state: state
  });

  const authUrl = `https://www.instagram.com/oauth/authorize?${params.toString()}`;

  return {
    statusCode: 302,
    headers: { Location: authUrl },
    body: ''
  };
};
