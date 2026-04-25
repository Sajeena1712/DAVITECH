import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import ChatWindow from "./components/ChatWindow.jsx";
import Header from "./components/Header.jsx";
import Sidebar from "./components/Sidebar.jsx";

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

function getSavedChats() {
  if (typeof localStorage === "undefined") {
    return [createChat()];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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
    // Persist chats locally so the history survives refreshes.
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
  }, [selectedChat?.messages?.length ?? 0, isLoading]);

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

    // Keep the typing state visible briefly before swapping in the simulated reply.
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
          <Sidebar
            chats={chats}
            drawerOpen={drawerOpen}
            formatDate={formatDate}
            onCreateChat={createNewChat}
            onDeleteChat={setDeleteChatId}
            onRenameChat={(chat) => setRenameChat({ id: chat.id, value: chat.title })}
            onSelectChat={setSelectedChatId}
            onToggleDrawer={() => setDrawerOpen((value) => !value)}
            selectedChatId={selectedChatId}
          />

          <main className="chat-panel">
            <Header
              drawerOpen={drawerOpen}
              engineOptions={ENGINE_OPTIONS}
              onSelectEngine={(event) => {
                if (!selectedChat) return;
                updateChat(selectedChat.id, (chat) => ({
                  ...chat,
                  engine: event.target.value,
                  updatedAt: now(),
                }));
              }}
              onToggleDrawer={() => setDrawerOpen((value) => !value)}
              selectedEngine={selectedChat?.engine || ENGINE_OPTIONS[0]}
            />

            <ChatWindow
              bottomRef={bottomRef}
              copiedMessageId={copiedMessageId}
              formatTime={formatTime}
              inputValue={inputValue}
              isLoading={isLoading}
              messages={messages}
              onComposerSubmit={sendMessage}
              onCopyMessage={copyMessage}
              onDeleteMessage={(message) =>
                setDeleteMessageTarget({
                  chatId: selectedChat.id,
                  messageId: message.id,
                })
              }
              onEditMessage={(message) =>
                setEditMessage({
                  chatId: selectedChat.id,
                  messageId: message.id,
                  value: message.content,
                })
              }
              onInputChange={setInputValue}
              onSend={sendMessage}
              onStarterClick={setInputValue}
              selectedChat={selectedChat}
              showLanding={showLanding}
              starterCards={starterCards}
            />
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




