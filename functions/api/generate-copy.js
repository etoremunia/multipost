export async function onRequestPost(context) {
  try {
    const { topic, tone } = await context.request.json();

    if (!topic) {
      return new Response(JSON.stringify({ error: "El tema es obligatorio" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const prompt = `
      Eres un experto copywriter de redes sociales. Un creador quiere hacer un video corto sobre: "${topic}".
      El tono debe ser: "${tone}".
      
      Devuelve ÚNICAMENTE un objeto JSON válido (sin texto antes ni después, sin backticks) con esta estructura exacta:
      {
        "tiktok": {
          "hook": "Texto impactante para los primeros 3 segundos",
          "on_screen_text": "Texto corto para poner grande en el video",
          "caption": "Descripción para el post de TikTok con emojis",
          "hashtags": "#hashtag1 #hashtag2 #hashtag3 #hashtag4 #hashtag5"
        },
        "instagram": {
          "caption": "Descripción estética para Instagram Reels con saltos de línea y emojis, terminando con una pregunta para fomentar comentarios",
          "hashtags": "#hashtag1 #hashtag2 #hashtag3"
        },
        "youtube": {
          "title": "Título atractivo para YouTube Shorts (máximo 60 caracteres)",
          "description": "Descripción para YouTube Shorts (unas 3 líneas)"
        }
      }
    `;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${context.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return new Response(JSON.stringify({ error: "Error con OpenAI", details: errorData }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const data = await response.json();
    const aiText = data.choices[0].message.content;
    const parsedResult = JSON.parse(aiText);
    
    return new Response(JSON.stringify(parsedResult), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: "Error procesando la solicitud", details: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
