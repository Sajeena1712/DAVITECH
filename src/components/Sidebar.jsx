import React from "react";

function Sidebar({
  chats,
  drawerOpen,
  formatDate,
  onCreateChat,
  onDeleteChat,
  onRenameChat,
  onSelectChat,
  onToggleDrawer,
  selectedChatId,
}) {
  return (
    <aside className={`sidebar ${drawerOpen ? "open" : "closed"}`}>
      <div className="brand">
        <span className="brand-mark">D</span>
        <div className="brand-name">DaivAI</div>
        <button
          className="drawer-toggle"
          type="button"
          aria-label={drawerOpen ? "Close sidebar" : "Open sidebar"}
          onClick={onToggleDrawer}
        >
          ×
        </button>
      </div>

      <button className="new-chat-button" onClick={onCreateChat} type="button">
        + New Chat
      </button>

      <div className="chat-history">
        <div className="section-title">Chat History</div>
        <div className="chat-list">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`chat-item ${chat.id === selectedChatId ? "active" : ""}`}
            >
              <button type="button" className="chat-select" onClick={() => onSelectChat(chat.id)}>
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
                  onClick={() => onRenameChat(chat)}
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
                  onClick={() => onDeleteChat(chat.id)}
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
  );
}

export default Sidebar;
