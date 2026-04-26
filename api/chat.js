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
    const reply = await requestHuggingFaceReply({ prompt, engine, history });
    res.status(200).json({ reply, provider: "huggingface" });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
}
