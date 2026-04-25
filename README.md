# DaivAI - AI Chat Interface

DaivAI is a React + JavaScript ChatGPT-style web app built for the frontend task. It focuses on the main product flows: creating chats, switching chats, sending messages, editing messages, deleting messages, and switching AI engines from the UI.

## Structure

- `src/App.jsx` contains the full app logic and rendering
- `src/App.css` contains all styling

## Completed Features

- Left sidebar with app title and `+ New Chat`
- Chat history list
- Switch between chats
- Rename chat
- Delete chat with confirmation popup
- Right chat playground with engine dropdown
- Send messages from the input box
- Simulated AI replies
- Edit message popup
- Delete message confirmation popup
- Loading / typing animation while the AI reply is generated
- localStorage persistence
- Responsive layout
- Clean white theme

## AI Engines

- Neural Nexus
- Cerebral Prime
- Synapse Ultra
- Logic Core

## Assumptions

- AI responses are simulated locally instead of calling a live API.
- Markdown rendering was not added to keep the project simple and easy to review.
- No icon library was used.
- The code is intentionally kept small and direct so it looks like a normal student/intern project.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open the local URL shown in the terminal, usually `http://localhost:5173/`

```

## Notes

- The app state stays in `localStorage`, so chats remain after refresh.
- The codebase is intentionally minimal and uses only two source files to keep it easy to understand.
