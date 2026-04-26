import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const STORAGE_KEY = "daivai-chats-v1";
const THEME_KEY = "daivai-theme-v1";
const AUTH_KEY = "daivai-auth-v1";
const USERS_KEY = "daivai-users-v1";
const MONGO_AUTH_ENABLED = import.meta.env.VITE_MONGO_AUTH_ENABLED === "true";

const ENGINE_OPTIONS = [
  "Neural Nexus",
  "Cerebral Prime",
  "Synapse Ultra",
  "Logic Core",
];

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function now() {
  return new Date().toISOString();
}

function formatTime(value) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function createChat() {
  const timestamp = now();
  return {
    id: createId(),
    title: "New Chat",
    engine: "Neural Nexus",
    createdAt: timestamp,
    updatedAt: timestamp,
    messages: [
      {
        id: createId(),
        role: "assistant",
        content: "Welcome to DaivAI. Start typing and I will reply with a simulated response.",
        createdAt: timestamp,
      },
    ],
  };
}

function normalizeMessage(message) {
  if (!message || typeof message !== "object") {
    return null;
  }

  const role = message.role === "assistant" ? "assistant" : "user";
  const content = typeof message.content === "string" ? message.content : "";
  const createdAt = typeof message.createdAt === "string" ? message.createdAt : now();
  const updatedAt = typeof message.updatedAt === "string" ? message.updatedAt : createdAt;

  return {
    id: typeof message.id === "string" ? message.id : createId(),
    role,
    content,
    createdAt,
    updatedAt,
  };
}

function normalizeChat(chat) {
  if (!chat || typeof chat !== "object") {
    return createChat();
  }

  const normalizedMessages = Array.isArray(chat.messages)
    ? chat.messages.map(normalizeMessage).filter(Boolean)
    : [];

  const timestamp = typeof chat.createdAt === "string" ? chat.createdAt : now();

  return {
    id: typeof chat.id === "string" ? chat.id : createId(),
    title: typeof chat.title === "string" && chat.title.trim() ? chat.title : "New Chat",
    engine: ENGINE_OPTIONS.includes(chat.engine) ? chat.engine : ENGINE_OPTIONS[0],
    createdAt: timestamp,
    updatedAt: typeof chat.updatedAt === "string" ? chat.updatedAt : timestamp,
    messages: normalizedMessages.length > 0 ? normalizedMessages : createChat().messages,
  };
}

function getChatTitle(text) {
  const trimmed = text.trim();
  if (!trimmed) return "New Chat";
  return trimmed.split(/\s+/).slice(0, 5).join(" ");
}

function getSavedChats(email) {
  if (typeof localStorage === "undefined") {
    return [createChat()];
  }

  try {
    const raw = localStorage.getItem(getChatsStorageKey(email));
    if (!raw) return [createChat()];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [createChat()];
    return parsed.map(normalizeChat);
  } catch {
    return [createChat()];
  }
}

function buildAssistantReply(prompt, engine) {
  const engineTone = {
    "Neural Nexus": "clear and balanced",
    "Cerebral Prime": "thoughtful and detailed",
    "Synapse Ultra": "fast and practical",
    "Logic Core": "precise and direct",
  };

  const summary = prompt.trim().split(/\s+/).slice(0, 10).join(" ");
  return [
    `Using ${engine}, here is a ${engineTone[engine]} reply.`,
    summary ? `I understood: "${summary}".` : "I received your message.",
    "You can keep chatting, rename chats, or edit any user message.",
  ].join("\n");
}

function getSavedTheme() {
  if (typeof localStorage === "undefined") {
    return "light";
  }

  const saved = localStorage.getItem(THEME_KEY);
  return saved === "dark" ? "dark" : "light";
}

function getChatsStorageKey(email) {
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  return normalizedEmail ? `${STORAGE_KEY}:${normalizedEmail}` : STORAGE_KEY;
}

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function normalizeUser(user) {
  if (!user || typeof user !== "object") {
    return null;
  }

  const email = normalizeEmail(user.email);
  const name = typeof user.name === "string" ? user.name.trim() : "";
  const password = typeof user.password === "string" ? user.password : "";

  if (!email || !name || !password) {
    return null;
  }

  return { name, email, password };
}

function getSavedUsers() {
  if (typeof localStorage === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeUser).filter(Boolean);
  } catch {
    return [];
  }
}

function getSavedSession() {
  if (typeof localStorage === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const email = normalizeEmail(parsed?.email);
    const name = typeof parsed?.name === "string" ? parsed.name.trim() : "";
    if (!email) return null;
    return { email, name };
  } catch {
    return null;
  }
}

function isStrongPassword(password) {
  return (
    typeof password === "string" &&
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

async function requestAssistantReply({ prompt, engine, history }) {
  const browserApiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const isLocalHost =
    typeof window !== "undefined" &&
    /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/.test(window.location.hostname);

  if (!isLocalHost) {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, engine, history }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.error || `Gemini request failed with status ${response.status}`);
    }

    const data = await response.json();
    const reply = typeof data.reply === "string" ? data.reply.trim() : "";
    if (!reply) {
      throw new Error("Gemini returned an empty response.");
    }
    return reply;
  }

  if (browserApiKey) {
    try {
      const profiles = {
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
      const profile = profiles[engine] ?? profiles["Neural Nexus"];
      const contents = (Array.isArray(history) ? history : [])
        .filter((message) => message && typeof message.content === "string")
        .map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        }));

      if (!contents.length) {
        contents.push({
          role: "user",
          parts: [{ text: prompt }],
        });
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(browserApiKey)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
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

      if (response.ok) {
        const data = await response.json();
        const reply = data?.candidates?.[0]?.content?.parts?.map((part) => part?.text || "").join("").trim() || "";

        if (reply) {
          return reply;
        }
      }
    } catch {
      // Fall through to the server route or an explicit error.
    }
  }

  throw new Error("Gemini is not configured for this environment.");
}

async function requestMongoAuth(payload) {
  const response = await fetch("/api/auth", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || "Authentication request failed.");
  }

  return data;
}

function App() {
  const [users, setUsers] = useState(() => (MONGO_AUTH_ENABLED ? [] : getSavedUsers()));
  const [authUser, setAuthUser] = useState(() => {
    const session = getSavedSession();
    if (!session) return null;
    const savedUser = getSavedUsers().find((user) => user.email === session.email);
    return savedUser ? { name: savedUser.name, email: savedUser.email } : session;
  });
  const [authMode, setAuthMode] = useState("signin");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState(() => getSavedSession()?.email ?? "");
  const [authPassword, setAuthPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [initialChats] = useState(() => getSavedChats(getSavedSession()?.email));
  const [chats, setChats] = useState(() => initialChats);
  const [selectedChatId, setSelectedChatId] = useState(() => initialChats[0]?.id ?? "");
  const [inputValue, setInputValue] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [booting, setBooting] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState(() => getSavedTheme());
  const [renameChat, setRenameChat] = useState(null);
  const [editMessage, setEditMessage] = useState(null);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [deleteChatId, setDeleteChatId] = useState(null);
  const [deleteMessageTarget, setDeleteMessageTarget] = useState(null);
  const bottomRef = useRef(null);
  const copyTimerRef = useRef(null);

  const selectedChat = useMemo(
    () => chats.find((chat) => chat.id === selectedChatId) ?? chats[0],
    [chats, selectedChatId],
  );

  const chatStorageKey = useMemo(
    () => getChatsStorageKey(authUser?.email),
    [authUser?.email],
  );

  const userDisplayName = authUser?.name || authUser?.email || "User";

  useEffect(() => {
    // Persist chats locally so the history survives refreshes.
    if (typeof localStorage === "undefined") return;
    if (!authUser?.email) return;
    localStorage.setItem(chatStorageKey, JSON.stringify(chats));
  }, [authUser?.email, chatStorageKey, chats]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(THEME_KEY, theme);
    }
  }, [theme]);

  useEffect(() => {
    if (typeof localStorage === "undefined" || MONGO_AUTH_ENABLED) return;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (!selectedChatId && chats[0]) {
      setSelectedChatId(chats[0].id);
    }
  }, [selectedChatId, chats]);

  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    if (!authUser?.email || !rememberMe) {
      localStorage.removeItem(AUTH_KEY);
      return;
    }
    localStorage.setItem(AUTH_KEY, JSON.stringify(authUser));
  }, [authUser, rememberMe]);

  useEffect(() => {
    if (authUser?.email) {
      const nextChats = getSavedChats(authUser.email);
      setChats(nextChats);
      setSelectedChatId(nextChats[0]?.id ?? "");
      setAuthEmail(authUser.email);
      setAuthError("");
      setAuthNotice("");
      setAuthMode("signin");
    }
  }, [authUser?.email]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [selectedChat?.messages?.length ?? 0, isLoading]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBooting(false);
    }, 1300);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  function updateChat(chatId, updater) {
    setChats((current) => current.map((chat) => (chat.id === chatId ? updater(chat) : chat)));
  }

  function clearAuthFeedback() {
    setAuthError("");
    setAuthNotice("");
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    const email = normalizeEmail(authEmail);
    const password = authPassword;

    function completeAuthSession(nextSession, notice = "") {
      const nextChats = getSavedChats(nextSession.email);
      setAuthUser(nextSession);
      setChats(nextChats);
      setSelectedChatId(nextChats[0]?.id ?? "");
      setAuthPassword("");
      setAuthError("");
      setAuthNotice(notice);
      setDrawerOpen(true);

      if (typeof localStorage !== "undefined") {
        if (rememberMe) {
          localStorage.setItem(AUTH_KEY, JSON.stringify(nextSession));
        } else {
          localStorage.removeItem(AUTH_KEY);
        }
      }
    }

    if (authMode === "signup") {
      const name = authName.trim();
      if (!name) {
        setAuthError("Enter your name.");
        return;
      }
      if (!email || !email.includes("@")) {
        setAuthError("Enter a valid email address.");
        return;
      }
      if (!isStrongPassword(password)) {
        setAuthError("Password must be 8+ chars with upper, lower, number, and symbol.");
        return;
      }

      if (MONGO_AUTH_ENABLED) {
        try {
          const data = await requestMongoAuth({ mode: "signup", name, email, password });
          if (data?.user) {
            setUsers((current) => [
              { name, email, password },
              ...current.filter((user) => user.email !== email),
            ]);
            completeAuthSession(data.user, "Account created. You are signed in now.");
            return;
          }
        } catch (error) {
          setAuthError(error.message || "Unable to create account.");
          return;
        }
      }

      if (users.some((user) => user.email === email)) {
        setAuthError("An account already exists for this email.");
        return;
      }

      const nextUser = { name, email, password };
      setUsers((current) => [nextUser, ...current.filter((user) => user.email !== email)]);
      completeAuthSession({ name, email }, "Account created. You are signed in now.");
      return;
    }

    if (authMode === "forgot") {
      if (!email || !email.includes("@")) {
        setAuthError("Enter a valid email address.");
        return;
      }
      if (!isStrongPassword(password)) {
        setAuthError("New password must be 8+ chars with upper, lower, number, and symbol.");
        return;
      }

      if (MONGO_AUTH_ENABLED) {
        try {
          const data = await requestMongoAuth({ mode: "forgot", email, password });
          if (data?.user) {
            setUsers((current) =>
              current.map((user) => (user.email === email ? { ...user, password } : user)),
            );
            setAuthMode("signin");
            setAuthPassword("");
            setShowPassword(false);
            setAuthError("");
            setAuthNotice("Password updated. Please sign in again.");
            return;
          }
        } catch (error) {
          setAuthError(error.message || "Unable to update password.");
          return;
        }
      }

      const existing = users.find((user) => user.email === email);
      if (!existing) {
        setAuthError("No account found for that email.");
        return;
      }

      const updatedUsers = users.map((user) => (user.email === email ? { ...user, password } : user));
      setUsers(updatedUsers);
      setAuthMode("signin");
      setAuthPassword("");
      setShowPassword(false);
      setAuthError("");
      setAuthNotice("Password updated. Please sign in again.");
      return;
    }

    if (!email || !email.includes("@")) {
      setAuthError("Enter a valid email address.");
      return;
    }

    if (!password) {
      setAuthError("Enter your password.");
      return;
    }

    if (MONGO_AUTH_ENABLED) {
      try {
        const data = await requestMongoAuth({ mode: "signin", email, password });
        if (data?.user) {
          completeAuthSession(data.user);
          return;
        }
      } catch (error) {
        setAuthError(error.message || "Unable to sign in.");
        return;
      }
    }

    const matchedUser = users.find((user) => user.email === email);
    if (!matchedUser || matchedUser.password !== password) {
      setAuthError("Email or password is incorrect.");
      return;
    }

    completeAuthSession({ name: matchedUser.name, email: matchedUser.email });
  }

  function handleLogout() {
    setAuthUser(null);
    setAuthName("");
    setAuthEmail("");
    setAuthPassword("");
    setAuthError("");
    setAuthNotice("");
    setAuthMode("signin");
    setSelectedChatId("");
    setChats([createChat()]);
    setInputValue("");
    setRenameChat(null);
    setEditMessage(null);
    setDeleteChatId(null);
    setDeleteMessageTarget(null);
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(AUTH_KEY);
    }
  }

  function switchAuthMode(mode) {
    setAuthMode(mode);
    setAuthError("");
    setAuthNotice("");
    setAuthPassword("");
    setShowPassword(false);
    if (mode !== "signup") {
      setAuthName("");
    }
    if (mode === "signin" && authUser?.email) {
      setAuthEmail(authUser.email);
      setAuthName(authUser.name || "");
    }
  }

  function createNewChat() {
    const chat = createChat();
    setChats((current) => [chat, ...current]);
    setSelectedChatId(chat.id);
    setInputValue("");
    setDrawerOpen(true);
  }

  async function sendMessage() {
    const text = inputValue.trim();
    if (!text || !selectedChat || isLoading) return;

    const timestamp = now();
    const userMessage = {
      id: createId(),
      role: "user",
      content: text,
      createdAt: timestamp,
    };

    const loadingMessage = {
      id: createId(),
      role: "assistant",
      content: "Typing...",
      createdAt: timestamp,
    };

    setChats((current) =>
      current.map((chat) => {
        if (chat.id !== selectedChat.id) return chat;
        const nextMessages = [...chat.messages, userMessage, loadingMessage];
        return {
          ...chat,
          title: chat.title === "New Chat" ? getChatTitle(text) : chat.title,
          messages: nextMessages,
          updatedAt: timestamp,
        };
      }),
    );

    setInputValue("");
    setIsLoading(true);

    try {
      // Ask Gemini through the backend in production, and through the browser key only on localhost.
      const reply = await requestAssistantReply({
        prompt: text,
        engine: selectedChat.engine,
        history: [...selectedChat.messages, userMessage].slice(-12),
      });

      const replyTime = now();
      updateChat(selectedChat.id, (chat) => ({
        ...chat,
        messages: chat.messages.map((message) =>
          message.id === loadingMessage.id
            ? { ...message, content: reply, createdAt: replyTime }
            : message,
        ),
        updatedAt: replyTime,
      }));
    } catch (error) {
      const failureReply =
        error instanceof Error ? error.message : "Gemini API is unavailable right now.";
      const replyTime = now();
      updateChat(selectedChat.id, (chat) => ({
        ...chat,
        messages: chat.messages.map((message) =>
          message.id === loadingMessage.id
            ? { ...message, content: failureReply, createdAt: replyTime }
            : message,
        ),
        updatedAt: replyTime,
      }));
    } finally {
      setIsLoading(false);
    }
  }

  function renameSelectedChat() {
    if (!renameChat) return;
    updateChat(renameChat.id, (chat) => ({
      ...chat,
      title: renameChat.value.trim() || "New Chat",
      updatedAt: now(),
    }));
    setRenameChat(null);
  }

  function deleteSelectedChat() {
    if (!deleteChatId) return;
    setChats((current) => {
      const next = current.filter((chat) => chat.id !== deleteChatId);
      if (next.length === 0) {
        const fallback = createChat();
        setSelectedChatId(fallback.id);
        return [fallback];
      }
      if (selectedChatId === deleteChatId) {
        setSelectedChatId(next[0].id);
      }
      return next;
    });
    setDeleteChatId(null);
  }

  function saveEditedMessage() {
    if (!editMessage) return;
    updateChat(editMessage.chatId, (chat) => ({
      ...chat,
      messages: chat.messages.map((message) =>
        message.id === editMessage.messageId
          ? { ...message, content: editMessage.value.trim(), updatedAt: now() }
          : message,
      ),
      updatedAt: now(),
    }));
    setEditMessage(null);
  }

  function copyMessage(text, messageId) {
    const done = () => {
      setCopiedMessageId(messageId);
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => {
        setCopiedMessageId(null);
      }, 1200);
    };

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(done);
      return;
    }

    const temp = document.createElement("textarea");
    temp.value = text;
    temp.style.position = "fixed";
    temp.style.left = "-9999px";
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    document.body.removeChild(temp);
    done();
  }

  function deleteSelectedMessage() {
    if (!deleteMessageTarget) return;
    updateChat(deleteMessageTarget.chatId, (chat) => ({
      ...chat,
      messages: chat.messages.filter((message) => message.id !== deleteMessageTarget.messageId),
      updatedAt: now(),
    }));
    setDeleteMessageTarget(null);
  }

  const messages = selectedChat?.messages || [];
  const showLanding = messages.length === 0 || (messages.length === 1 && messages[0]?.role === "assistant");
  const starterCards = [
    "Quickly summarize this text",
    "Help me write a project README",
    "Turn my idea into bullet points",
    "Explain this code simply",
  ];

  if (!authUser) {
    return (
      <div className="app-root">
        {booting ? (
          <div className="boot-screen">
            <div className="boot-card">
              <div className="boot-logo">
                <span>DA</span>
              </div>
              <h1>DaivAI</h1>
              <p>Loading AI model...</p>
              <div className="boot-progress" aria-hidden="true">
                <span />
              </div>
              <div className="boot-dots" aria-label="Loading">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        ) : (
          <div className="auth-screen">
            <div className="auth-layout">
              <aside className="auth-hero">
                <div className="auth-hero-badge">DaivAI</div>
                <h2>Secure access for every chat session</h2>
                <p>
                  DaivAI keeps the login flow simple, protected, and easy to trust. Your account is tied to your email, your password is validated for strength, and your workspace stays personal.
                </p>
                <div className="auth-hero-footer">
                  <span>MongoDB stored</span>
                  <span>Strong password</span>
                  <span>Private workspace</span>
                </div>
              </aside>

              <section className="auth-card">
                <div className="auth-brand">
                  <div>
                    <h1>{authMode === "signup" ? "Create account" : authMode === "forgot" ? "Reset password" : "Welcome back"}</h1>
                    <p>
                      {authMode === "signup"
                        ? "Create your account to start chatting."
                        : authMode === "forgot"
                          ? "Reset your password and return to chat."
                          : "Sign in to continue to your chat workspace."}
                    </p>
                  </div>
                </div>

                <form className="auth-form" onSubmit={handleAuthSubmit}>
                  {authMode === "signup" && (
                    <label className="auth-field">
                      <span>Name</span>
                      <input
                        type="text"
                        value={authName}
                        onChange={(event) => setAuthName(event.target.value)}
                        placeholder="Your full name"
                        autoComplete="name"
                      />
                    </label>
                  )}

                  <label className="auth-field">
                    <span>Email</span>
                    <input
                      type="email"
                      value={authEmail}
                      onChange={(event) => setAuthEmail(event.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </label>

                  <label className="auth-field">
                    <span>{authMode === "forgot" ? "New password" : "Password"}</span>
                    <div className="auth-password-row">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={authPassword}
                        onChange={(event) => setAuthPassword(event.target.value)}
                        placeholder={authMode === "forgot" ? "Enter a new password" : "Enter your password"}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword((value) => !value)}
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </label>

                  {authMode !== "forgot" && (
                    <label className="auth-remember">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(event) => setRememberMe(event.target.checked)}
                      />
                      <span>Remember me on this device</span>
                    </label>
                  )}

                  {authNotice && <div className="auth-notice">{authNotice}</div>}
                  {authError && <div className="auth-error">{authError}</div>}

                  <button type="submit" className="auth-submit">
                    {authMode === "signup" ? "Create account" : authMode === "forgot" ? "Update password" : "Sign in"}
                  </button>
                  <div className="auth-links">
                    {authMode === "signin" ? (
                      <>
                        <button type="button" onClick={() => switchAuthMode("forgot")}>
                          Forgot password?
                        </button>
                        <button type="button" onClick={() => switchAuthMode("signup")}>
                          Need an account?
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={() => switchAuthMode("signin")}>
                        Back to sign in
                      </button>
                    )}
                  </div>
                  <div className="auth-note">
                    {authMode === "signup"
                      ? "Password must be 8+ characters and include upper, lower, number, and symbol."
                      : authMode === "forgot"
                        ? "Enter your email and choose a new strong password."
                        : "Use your registered email and password to sign in."}
                  </div>
                </form>
              </section>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app-root">
      {booting ? (
        <div className="boot-screen">
          <div className="boot-card">
            <div className="boot-logo">
              <span>DA</span>
            </div>
            <h1>DaivAI</h1>
            <p>Loading AI model...</p>
            <div className="boot-progress" aria-hidden="true">
              <span />
            </div>
            <div className="boot-dots" aria-label="Loading">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      ) : (
        <div className="app-shell">
          <aside className={`sidebar ${drawerOpen ? "open" : "closed"}`}>
        <div className="brand">
          <span className="brand-mark">D</span>
          <div className="brand-name">DaivAI</div>
          <button
            className="drawer-toggle"
            type="button"
            aria-label={drawerOpen ? "Close sidebar" : "Open sidebar"}
            onClick={() => setDrawerOpen((value) => !value)}
          >
            <span aria-hidden="true">X</span>
          </button>
        </div>

        <button className="new-chat-button" onClick={createNewChat} type="button">
          + New Chat
        </button>

        <div className="chat-history">
          <div className="section-title">Chat History</div>
          <div className="chat-list">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className={`chat-item ${chat.id === selectedChatId ? "active" : ""}`}
                onClick={() => setSelectedChatId(chat.id)}
              >
                <button type="button" className="chat-select">
                  <span className="chat-title">{chat.title}</span>
                  <span className="chat-meta">
                    {chat.engine} | {formatDate(chat.updatedAt)}
                  </span>
                </button>
                <div className="chat-actions">
                  <button
                    type="button"
                    className="chat-action"
                    aria-label="Rename chat"
                    title="Rename chat"
                    onClick={() => setRenameChat({ id: chat.id, value: chat.title })}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M4 20h4l10.5-10.5a2 2 0 00-4-4L4 16v4z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="chat-action danger"
                    aria-label="Delete chat"
                    title="Delete chat"
                    onClick={() => setDeleteChatId(chat.id)}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M5 7h14M10 7V5.8A.8.8 0 0110.8 5h2.4a.8.8 0 01.8.8V7m-7 0l.6 11a1 1 0 001 .9h5.8a1 1 0 001-.9L15 7"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="user-chip">
            <span className="user-avatar">U</span>
            <div className="user-info">
              <strong>{userDisplayName}</strong>
              <span>{authUser.email}</span>
            </div>
          </div>
          <button type="button" className="footer-menu logout-button" aria-label="Log out" onClick={handleLogout}>
            <span aria-hidden="true">Logout</span>
          </button>
          <button type="button" className="footer-menu" aria-label="Account menu">
            <span aria-hidden="true">Menu</span>
          </button>
        </div>
          </aside>

          <main className="chat-panel">
            <header className="chat-header">
              <button
                className="drawer-toggle chat-toggle"
                type="button"
                aria-label={drawerOpen ? "Close sidebar" : "Open sidebar"}
                onClick={() => setDrawerOpen((value) => !value)}
              >
                <span aria-hidden="true">☰</span>
              </button>

              <button
                type="button"
                className="theme-toggle"
                onClick={() => setTheme((value) => (value === "dark" ? "light" : "dark"))}
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </button>

              <label className="engine-picker">
                <select
                  value={selectedChat?.engine || ENGINE_OPTIONS[0]}
                  onChange={(event) => {
                    if (!selectedChat) return;
                    updateChat(selectedChat.id, (chat) => ({
                      ...chat,
                      engine: event.target.value,
                      updatedAt: now(),
                    }));
                  }}
                >
                  {ENGINE_OPTIONS.map((engine) => (
                    <option key={engine} value={engine}>
                      {engine}
                    </option>
                  ))}
                </select>
              </label>
            </header>

            <section className={`conversation ${showLanding ? "landing" : "chatting"}`}>
              {showLanding ? (
                <div className="landing-card">
                  <div className="landing-badge">DaivAI</div>
                  <h2>Welcome to DaivAI</h2>
                  <p>Start a prompt, switch the engine, or pick one of the sample ideas below.</p>
                  <div className="starter-grid">
                    {starterCards.map((item) => (
                      <button key={item} type="button" className="starter-card" onClick={() => setInputValue(item)}>
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.length === 0 && (
                    <div className="empty-state">
                      <h3>No messages yet</h3>
                      <p>Start a new message below to begin this chat.</p>
                    </div>
                  )}

                  {messages.map((message) => (
                    <div key={message.id} className={`message-row ${message.role}`}>
                      <div className={`message-avatar ${message.role}`}>
                        {message.role === "user" ? "U" : "AI"}
                      </div>
                      <div className={`message-bubble ${message.role}`}>
                        <div className="message-head">
                          <span className="message-name">
                            {message.role === "user" ? "You" : selectedChat?.engine || "Assistant"}
                          </span>
                          <span className="message-time">{formatTime(message.updatedAt || message.createdAt)}</span>
                        </div>
                        <div className="message-text">{message.content}</div>
                      </div>
                      {message.role === "user" && (
                        <div className="message-hover-actions">
                          <button
                            type="button"
                            className="message-action"
                            title="Copy message"
                            aria-label="Copy message"
                            onClick={() => copyMessage(message.content, message.id)}
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path
                                d="M9 9h8v12H5V5h4m2 0h8v4m-8 0L21 1"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="message-action"
                            title="Edit message"
                            aria-label="Edit message"
                            onClick={() =>
                              setEditMessage({
                                chatId: selectedChat.id,
                                messageId: message.id,
                                value: message.content,
                              })
                            }
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path
                                d="M4 20h4l10.5-10.5a2 2 0 00-4-4L4 16v4z"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="message-action danger"
                            title="Delete message"
                            aria-label="Delete message"
                            onClick={() =>
                              setDeleteMessageTarget({
                                chatId: selectedChat.id,
                                messageId: message.id,
                              })
                            }
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path
                                d="M5 7h14M10 7V5.8A.8.8 0 0110.8 5h2.4a.8.8 0 01.8.8V7m-7 0l.6 11a1 1 0 001 .9h5.8a1 1 0 001-.9L15 7"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                          {copiedMessageId === message.id && <span className="copy-toast">Copied</span>}
                        </div>
                      )}
                    </div>
                  ))}

                  {isLoading && (
                    <div className="typing">
                      <span />
                      <span />
                      <span />
                    </div>
                  )}

                  <div ref={bottomRef} />
                </>
              )}
            </section>

            <footer className="composer">
              <form
                className="composer-shell"
                onSubmit={(event) => {
                  event.preventDefault();
                  sendMessage();
                }}
              >
                <button type="button" className="composer-icon" aria-label="Attach file">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M8.5 12.5l5.8-5.8a2.8 2.8 0 114 4l-7.7 7.7a4.2 4.2 0 11-5.9-5.9l7.6-7.6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <textarea
                  className="composer-input"
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Message Neural Nexus..."
                  rows={2}
                />
                <div className="composer-tools">
                  <button type="button" className="composer-icon" aria-label="Voice input">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M12 15.5a3.5 3.5 0 003.5-3.5V8a3.5 3.5 0 10-7 0v4a3.5 3.5 0 003.5 3.5z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M6.5 11.5v.5a5.5 5.5 0 0011 0v-.5M12 17v3M9 20h6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <button
                    type="submit"
                    className="composer-send"
                    disabled={isLoading}
                    aria-label="Send message"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M4 12l15-7-4 15-3.5-6.5L4 12z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </form>
              <div className="composer-footer">
                <span>Press Enter to send, Shift+Enter for a new line</span>
                <span>{inputValue.length} / 4000</span>
              </div>
            </footer>
          </main>

          {renameChat && (
            <div className="modal-backdrop" onClick={() => setRenameChat(null)}>
              <div className="modal-card" onClick={(event) => event.stopPropagation()}>
                <h3>Rename chat</h3>
                <input
                  type="text"
                  value={renameChat.value}
                  onChange={(event) => setRenameChat({ ...renameChat, value: event.target.value })}
                  autoFocus
                />
                <div className="modal-actions">
                  <button type="button" className="mini-button" onClick={() => setRenameChat(null)}>
                    Cancel
                  </button>
                  <button type="button" className="send-button" onClick={renameSelectedChat}>
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {editMessage && (
            <div className="modal-backdrop" onClick={() => setEditMessage(null)}>
              <div className="modal-card" onClick={(event) => event.stopPropagation()}>
                <h3>Edit message</h3>
                <textarea
                  rows={6}
                  value={editMessage.value}
                  onChange={(event) => setEditMessage({ ...editMessage, value: event.target.value })}
                />
                <div className="modal-actions">
                  <button type="button" className="mini-button" onClick={() => setEditMessage(null)}>
                    Cancel
                  </button>
                  <button type="button" className="send-button" onClick={saveEditedMessage}>
                    Update
                  </button>
                </div>
              </div>
            </div>
          )}

          {deleteChatId && (
            <div className="modal-backdrop" onClick={() => setDeleteChatId(null)}>
              <div className="modal-card" onClick={(event) => event.stopPropagation()}>
                <h3>Delete chat</h3>
                <p>This will remove the chat and all messages from local storage.</p>
                <div className="modal-actions">
                  <button type="button" className="mini-button" onClick={() => setDeleteChatId(null)}>
                    Cancel
                  </button>
                  <button type="button" className="send-button danger" onClick={deleteSelectedChat}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          {deleteMessageTarget && (
            <div className="modal-backdrop" onClick={() => setDeleteMessageTarget(null)}>
              <div className="modal-card" onClick={(event) => event.stopPropagation()}>
                <h3>Delete message</h3>
                <p>This message will be removed permanently.</p>
                <div className="modal-actions">
                  <button type="button" className="mini-button" onClick={() => setDeleteMessageTarget(null)}>
                    Cancel
                  </button>
                  <button type="button" className="send-button danger" onClick={deleteSelectedMessage}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;




