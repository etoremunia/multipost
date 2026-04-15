export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const userEmail = url.searchParams.get('email');
  const clientId = context.env.INSTAGRAM_CLIENT_ID;
  const redirectUri = context.env.INSTAGRAM_REDIRECT_URI;

  if (!userEmail) return new Response(JSON.stringify({ error: 'Email requerido' }), { status: 400 });
  if (!clientId) return new Response(JSON.stringify({ error: 'Instagram no configurado aún' }), { status: 500 });

  const scopes = [
    'instagram_business_basic',
    'instagram_business_content_publish',
    'instagram_business_manage_messages',
    'instagram_business_manage_comments'
  ].join(',');

  const state = btoa(JSON.stringify({ email: userEmail }));
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    response_type: 'code',
    state: state
  });

  return Response.redirect(`https://www.instagram.com/oauth/authorize?${params.toString()}`, 302);
}
