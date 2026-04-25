import React from "react";

function MessageBubble({
  copied,
  engineName,
  formatTime,
  message,
  onCopy,
  onDelete,
  onEdit,
}) {
  const isUser = message.role === "user";
  const timestamp = message.updatedAt || message.createdAt;

  return (
    <div key={message.id} className={`message-row ${message.role}`}>
      <div className={`message-avatar ${message.role}`}>{isUser ? "U" : "AI"}</div>
      <div className={`message-bubble ${message.role}`}>
        <div className="message-head">
          <span className="message-name">{isUser ? "You" : engineName || "Assistant"}</span>
          <span className="message-time">{formatTime(timestamp)}</span>
        </div>
        <div className="message-text">{message.content}</div>
      </div>
      {isUser && (
        <div className="message-hover-actions">
          <button
            type="button"
            className="message-action"
            title="Copy message"
            aria-label="Copy message"
            onClick={() => onCopy(message.content, message.id)}
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
            onClick={() => onEdit(message)}
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
            onClick={() => onDelete(message)}
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
          {copied && <span className="copy-toast">Copied</span>}
        </div>
      )}
    </div>
  );
}

export default MessageBubble;
