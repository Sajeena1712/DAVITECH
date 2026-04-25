import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const STORAGE_KEY = "daivai-chats-v1";

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

function getChatTitle(text) {
  const trimmed = text.trim();
  if (!trimmed) return "New Chat";
  return trimmed.split(/\s+/).slice(0, 5).join(" ");
}

function getSavedChats() {
  if (typeof localStorage === "undefined") {
    return [createChat()];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [createChat()];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [createChat()];
    return parsed;
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

function App() {
  const [initialChats] = useState(() => getSavedChats());
  const [chats, setChats] = useState(() => initialChats);
  const [selectedChatId, setSelectedChatId] = useState(() => initialChats[0]?.id ?? "");
  const [inputValue, setInputValue] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [booting, setBooting] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [renameChat, setRenameChat] = useState(null);
  const [editMessage, setEditMessage] = useState(null);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [deleteChatId, setDeleteChatId] = useState(null);
  const [deleteMessageTarget, setDeleteMessageTarget] = useState(null);
  const bottomRef = useRef(null);
  const timerRef = useRef(null);
  const copyTimerRef = useRef(null);

  const selectedChat = useMemo(
    () => chats.find((chat) => chat.id === selectedChatId) ?? chats[0],
    [chats, selectedChatId],
  );

  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    if (!selectedChatId && chats[0]) {
      setSelectedChatId(chats[0].id);
    }
  }, [selectedChatId, chats]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [selectedChat?.messages.length, isLoading]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBooting(false);
    }, 1300);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  function updateChat(chatId, updater) {
    setChats((current) => current.map((chat) => (chat.id === chatId ? updater(chat) : chat)));
  }

  function createNewChat() {
    const chat = createChat();
    setChats((current) => [chat, ...current]);
    setSelectedChatId(chat.id);
    setInputValue("");
    setDrawerOpen(true);
  }

  function sendMessage() {
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

    timerRef.current = window.setTimeout(() => {
      const reply = buildAssistantReply(text, selectedChat.engine);
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
      setIsLoading(false);
    }, 1000);
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
            ×
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
              <strong>User</strong>
              <span>user@daivai.com</span>
            </div>
          </div>
          <button type="button" className="footer-menu" aria-label="Account menu">
            ⋯
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
                ☰
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
              <div className="composer-shell">
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
                    type="button"
                    className="composer-send"
                    onClick={sendMessage}
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
              </div>
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



