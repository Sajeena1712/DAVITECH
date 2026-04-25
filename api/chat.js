const ENGINE_PROFILES = {
  "Neural Nexus": {
    system: "You are DaivAI, a friendly and clear assistant. Keep answers concise and helpful.",
    temperature: 0.7,
  },
  "Cerebral Prime": {
    system: "You are DaivAI, a thoughtful assistant. Give detailed, well-structured answers.",
    temperature: 0.5,
  },
  "Synapse Ultra": {
    system: "You are DaivAI, a fast assistant. Prefer short, practical answers.",
    temperature: 0.4,
  },
  "Logic Core": {
    system: "You are DaivAI, a precise assistant. Be direct, logical, and easy to scan.",
    temperature: 0.2,
  },
};

function toGeminiRole(role) {
  return role === "assistant" ? "model" : "user";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Missing GEMINI_API_KEY" });
    return;
  }

  try {
    const { prompt, engine, history } = req.body ?? {};
    const profile = ENGINE_PROFILES[engine] ?? ENGINE_PROFILES["Neural Nexus"];
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    const contents = Array.isArray(history)
      ? history
          .filter((message) => message && typeof message.content === "string")
          .map((message) => ({
            role: toGeminiRole(message.role),
            parts: [{ text: message.content }],
          }))
      : [];

    if (!contents.length && typeof prompt === "string") {
      contents.push({
        role: "user",
        parts: [{ text: prompt }],
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: profile.system }],
          },
          contents,
          generationConfig: {
            temperature: profile.temperature,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      res.status(response.status).json({ error: errorText || "Gemini request failed" });
      return;
    }

    const data = await response.json();
    const reply =
      data?.candidates?.[0]?.content?.parts
        ?.map((part) => part?.text || "")
        .join("")
        .trim() || "";

    if (!reply) {
      res.status(502).json({ error: "Empty Gemini response" });
      return;
    }

    res.status(200).json({ reply });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
}
