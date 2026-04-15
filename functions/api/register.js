export async function onRequestPost(context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  const { name, email, password } = await context.request.json().catch(() => ({}));
  if (!name || !email || !password) return new Response(JSON.stringify({ error: 'Faltan campos' }), { status: 400, headers });
  const supabaseUrl = context.env.SUPABASE_URL;
  const supabaseKey = context.env.SUPABASE_ANON_KEY;
  const checkRes = await fetch(`${supabaseUrl}/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=email`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const existing = await checkRes.json();
  if (existing.length > 0) return new Response(JSON.stringify({ error: 'Ya existe una cuenta con ese email.' }), { status: 409, headers });
  const insertRes = await fetch(`${supabaseUrl}/rest/v1/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ name, email, password_hash: password, plan: 'gratis' })
  });
  if (!insertRes.ok) return new Response(JSON.stringify({ error: 'Error al crear usuario' }), { status: 500, headers });
  return new Response(JSON.stringify({ ok: true, name, email, plan: 'gratis' }), { status: 200, headers });
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
