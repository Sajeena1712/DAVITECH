import React from "react";
import MessageBubble from "./MessageBubble.jsx";

function ChatWindow({
  bottomRef,
  copiedMessageId,
  formatTime,
  inputValue,
  isLoading,
  messages,
  onComposerSubmit,
  onCopyMessage,
  onDeleteMessage,
  onEditMessage,
  onInputChange,
  onSend,
  onStarterClick,
  selectedChat,
  showLanding,
  starterCards,
}) {
  return (
    <>
      <section className={`conversation ${showLanding ? "landing" : "chatting"}`}>
        {showLanding ? (
          <div className="landing-card">
            <div className="landing-badge">DaivAI</div>
            <h2>Welcome to DaivAI</h2>
            <p>Start a prompt, switch the engine, or pick one of the sample ideas below.</p>
            <div className="starter-grid">
              {starterCards.map((item) => (
                <button key={item} type="button" className="starter-card" onClick={() => onStarterClick(item)}>
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
              <MessageBubble
                key={message.id}
                copied={copiedMessageId === message.id}
                engineName={selectedChat?.engine}
                formatTime={formatTime}
                message={message}
                onCopy={onCopyMessage}
                onDelete={onDeleteMessage}
                onEdit={onEditMessage}
              />
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
            onComposerSubmit();
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
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSend();
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
    </>
  );
}

export default ChatWindow;
