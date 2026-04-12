// netlify/functions/get-connections.js
// Devuelve qué plataformas tiene conectadas un usuario

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const email = event.queryStringParameters && event.queryStringParameters.email;
  if (!email) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email requerido' }) };
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    const res = await fetch(
      `${supabaseUrl}/rest/v1/platform_tokens?user_email=eq.${encodeURIComponent(email)}&select=platform,expires_at`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      }
    );

    const rows = await res.json();
    const connected = rows.map(r => r.platform);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ connected })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error al consultar conexiones' })
    };
  }
};
