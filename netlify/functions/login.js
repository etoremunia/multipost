// netlify/functions/login.js
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido' }) };

  const { email, password } = JSON.parse(event.body || '{}');
  if (!email || !password) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Faltan campos' }) };

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  const res = await fetch(`${supabaseUrl}/rest/v1/users?email=eq.${encodeURIComponent(email)}&password_hash=eq.${encodeURIComponent(password)}&select=name,email,plan`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const users = await res.json();
  if (!users.length) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Email o contraseña incorrectos.' }) };

  const user = users[0];
  return { statusCode: 200, headers, body: JSON.stringify({ ok: true, name: user.name, email: user.email, plan: user.plan }) };
};
