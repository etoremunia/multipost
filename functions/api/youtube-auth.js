export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const userEmail = url.searchParams.get('email');
  const clientId = context.env.YOUTUBE_CLIENT_ID;
  const redirectUri = context.env.YOUTUBE_REDIRECT_URI;

  if (!userEmail) return new Response(JSON.stringify({ error: 'Email requerido' }), { status: 400 });

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
    state: btoa(JSON.stringify({ email: userEmail }))
  });

  return Response.redirect(`https://accounts.google.com/o/oauth2/auth?${params.toString()}`, 302);
}
