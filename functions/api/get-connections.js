export async function onRequestGet(context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  const url = new URL(context.request.url);
  const email = url.searchParams.get('email');
  if (!email) return new Response(JSON.stringify({ error: 'Email requerido' }), { status: 400, headers });
  const supabaseUrl = context.env.SUPABASE_URL;
  const supabaseKey = context.env.SUPABASE_ANON_KEY;
  const res = await fetch(
    `${supabaseUrl}/rest/v1/platform_tokens?user_email=eq.${encodeURIComponent(email)}&select=platform,expires_at`,
    { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } }
  );
  const rows = await res.json();
  const connected = rows.map(r => r.platform);
  return new Response(JSON.stringify({ connected }), { status: 200, headers });
}

export async function onRequestOptions() {
  return new Response('', {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, OPTIONS'
    }
  });
}
