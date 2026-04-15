export async function onRequestPost(context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  const { email, password } = await context.request.json().catch(() => ({}));
  if (!email || !password) return new Response(JSON.stringify({ error: 'Faltan campos' }), { status: 400, headers });
  const supabaseUrl = context.env.SUPABASE_URL;
  const supabaseKey = context.env.SUPABASE_ANON_KEY;
  const res = await fetch(`${supabaseUrl}/rest/v1/users?email=eq.${encodeURIComponent(email)}&password_hash=eq.${encodeURIComponent(password)}&select=name,email,plan`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const users = await res.json();
  if (!users.length) return new Response(JSON.stringify({ error: 'Email o contraseña incorrectos.' }), { status: 401, headers });
  const user = users[0];
  return new Response(JSON.stringify({ ok: true, name: user.name, email: user.email, plan: user.plan }), { status: 200, headers });
}

export async function onRequestOptions() {
  return new Response('', {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    }
  });
}
