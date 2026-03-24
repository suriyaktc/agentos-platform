export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { system, messages, max_tokens, temperature } = req.body;

    // 🔹 Build messages safely
    const groqMessages = [];
    if (system) groqMessages.push({ role: 'system', content: system });
    if (messages && Array.isArray(messages)) {
      groqMessages.push(...messages);
    }

    // 🔹 Call Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-70b-versatile',
        messages: groqMessages,
        max_tokens: max_tokens || 1000,
        temperature: temperature || 0.7
      })
    });

    const data = await response.json();

    // 🔥 Proper error handling (IMPORTANT)
    if (!response.ok) {
      return res.status(response.status).json({
        error: {
          message: data?.error?.message || "Groq API error"
        }
      });
    }

    // 🔥 Handle empty response (CRITICAL FIX)
    if (!data.choices || !data.choices.length) {
      return res.status(500).json({
        error: { message: "No response from model" }
      });
    }

    const text = data.choices[0].message.content;

    // 🔹 Send response in SAME format (so frontend works)
    res.status(200).json({
      content: [{ type: 'text', text }],
      model: data.model,
      stop_reason: data.choices[0].finish_reason,
      usage: {
        input_tokens: data.usage?.prompt_tokens || 0,
        output_tokens: data.usage?.completion_tokens || 0
      }
    });

  } catch (e) {
    res.status(500).json({
      error: { message: e.message || "Server error" }
    });
  }
}
