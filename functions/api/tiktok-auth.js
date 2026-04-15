export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const userEmail = url.searchParams.get('email');
  const clientKey = context.env.TIKTOK_CLIENT_KEY;
  const redirectUri = context.env.TIKTOK_REDIRECT_URI;
  if (!userEmail) return new Response(JSON.stringify({ error: 'Email requerido' }), { status: 400 });
  if (!clientKey) return new Response(JSON.stringify({ error: 'TikTok no configurado aún' }), { status: 500 });
  const scopes = 'user.info.basic,video.upload';
  const state = btoa(JSON.stringify({ email: userEmail }));
  const params = new URLSearchParams({
    client_key: clientKey,
    scope: scopes,
    response_type: 'code',
    redirect_uri: redirectUri,
    state: state
  });
  return Response.redirect(`https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`, 302);
}
