# DaivAI

DaivAI is a React-based AI chat web application that simulates a ChatGPT-style conversation experience with multiple chats, editable messages, chat management, and selectable AI engines.

## Features

- Left sidebar with app branding and `+ New Chat`
- Multiple chat sessions with local persistence
- Rename chat via modal
- Delete chat with confirmation dialog
- Right-side chat playground with engine selector
- Message composer with Enter-to-send support
- User and assistant conversation flow
- Loading / typing indicator while the assistant reply is generated
- Edit user messages through a modal
- Delete user messages through a confirmation dialog
- Hover actions on user messages
- Responsive layout
- Clean white theme inspired by the reference design

## AI Engines

- Neural Nexus
- Cerebral Prime
- Synapse Ultra
- Logic Core

## Implementation Notes

- The assistant response is simulated locally instead of calling a live API.
- Chat state is stored in `localStorage`, so chats persist after refresh.
- The project uses React functional components and hooks.
- The production build is generated with Vite.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Start the app locally:

```bash
npm run dev
```

3. Open the local URL shown in the terminal, usually `http://localhost:5173/`

## Files

- `src/App.jsx` - main chat logic and UI
- `src/App.css` - styling
- `src/main.jsx` - app bootstrap

## Submission Summary

This project covers the core assignment flow:

- Create and switch between chats
- Send messages and receive simulated AI responses
- Edit and delete messages
- Rename and delete chats
- Select between multiple AI engines

