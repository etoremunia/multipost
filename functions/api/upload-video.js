export async function onRequestPost(context) {
  const json = (data, status = 200) => new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });

  try {
    const formData = await context.request.formData();
    const file = formData.get('video');
    const email = formData.get('email');
    const title = formData.get('title') || 'Video sin título';
    const description = formData.get('description') || '';
    const platformsRaw = formData.get('platforms');

    if (!file || !email) return json({ error: 'Faltan datos' }, 400);

    // DEBUG: devolver info del archivo sin procesarlo
    return json({
      ok: false,
      debug: true,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      email: email,
      title: title,
      platforms: platformsRaw
    }, 200);

  } catch (e) {
    return json({ error: 'Error interno: ' + e.message + ' | ' + (e.stack || '') }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
