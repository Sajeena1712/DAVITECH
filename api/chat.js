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

function toHfRole(role) {
  return role === "assistant" ? "assistant" : "user";
}

function buildMessages(prompt, history, systemPrompt) {
  const messages = [];

  if (systemPrompt) {
    messages.push({
      role: "system",
      content: systemPrompt,
    });
  }

  const conversation = Array.isArray(history)
    ? history.filter((message) => message && typeof message.content === "string")
    : [];

  for (const message of conversation) {
    messages.push({
      role: toHfRole(message.role),
      content: message.content,
    });
  }

  if (!messages.some((message) => message.role === "user")) {
    messages.push({
      role: "user",
      content: typeof prompt === "string" ? prompt : "",
    });
  }

  return messages;
}

async function requestHuggingFaceReply({ prompt, engine, history }) {
  const token =
    process.env.HF_TOKEN ||
    (typeof process.env.GEMINI_API_KEY === "string" && process.env.GEMINI_API_KEY.startsWith("hf_")
      ? process.env.GEMINI_API_KEY
      : "");
  if (!token) {
    throw new Error("Missing HF_TOKEN");
  }

  const model = process.env.HF_MODEL || "mistralai/Mistral-7B-Instruct-v0.3:fastest";
  const profile = ENGINE_PROFILES[engine] ?? ENGINE_PROFILES["Neural Nexus"];
  const messages = buildMessages(prompt, history, profile.system);

  const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: profile.temperature,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.error || "Hugging Face request failed");
  }

  const reply = data?.choices?.[0]?.message?.content;
  if (typeof reply === "string" && reply.trim()) {
    return reply.trim();
  }

  throw new Error("Empty Hugging Face response");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { prompt, engine, history } = req.body ?? {};
    try {
      const reply = await requestHuggingFaceReply({ prompt, engine, history });
      res.status(200).json({ reply, provider: "huggingface" });
      return;
    } catch (hfError) {
      const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      if (!geminiApiKey) {
        throw hfError;
      }

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
            "x-goog-api-key": geminiApiKey,
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

      res.status(200).json({ reply, provider: "gemini" });
      return;
    }
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
}
