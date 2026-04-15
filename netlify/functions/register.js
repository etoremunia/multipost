// netlify/functions/register.js
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido' }) };

  const { name, email, password } = JSON.parse(event.body || '{}');
  if (!name || !email || !password) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Faltan campos' }) };

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  // Verificar si ya existe
  const checkRes = await fetch(`${supabaseUrl}/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=email`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  const existing = await checkRes.json();
  if (existing.length > 0) return { statusCode: 409, headers, body: JSON.stringify({ error: 'Ya existe una cuenta con ese email.' }) };

  // Crear usuario
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

  if (!insertRes.ok) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Error al crear usuario' }) };

  return { statusCode: 200, headers, body: JSON.stringify({ ok: true, name, email, plan: 'gratis' }) };
};
