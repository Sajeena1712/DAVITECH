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
- Gemini API support through a serverless endpoint
- Separate sign in, sign up, and forgot-password pages
- Optional MongoDB-backed authentication for sign in, sign up, and password reset
- Dark mode toggle
- Responsive layout
- Clean white theme inspired by the reference design

## AI Engines

- Neural Nexus
- Cerebral Prime
- Synapse Ultra
- Logic Core

## Implementation Notes

- The assistant response is simulated locally unless the Gemini key is configured.
- In production, assistant replies are routed through Gemini from the `/api/chat` endpoint.
- Authentication can use MongoDB through `/api/auth` when `VITE_MONGO_AUTH_ENABLED=true`.
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

4. Add your Gemini key as `GEMINI_API_KEY` in your deployment environment. For local testing, put it in `.env.local`.
5. To enable MongoDB auth in production, set:

```bash
VITE_MONGO_AUTH_ENABLED=true
MONGODB_APP_ID=your_app_id
MONGODB_DATA_API_KEY=your_data_api_key
MONGODB_DATA_SOURCE=Cluster0
MONGODB_DATABASE=daivai
MONGODB_USERS_COLLECTION=users
```

## Files

- `src/App.jsx` - main chat logic and UI
- `src/App.css` - styling
- `src/main.jsx` - app bootstrap
- `api/chat.js` - Gemini serverless proxy
- `api/auth.js` - MongoDB-backed authentication endpoint

## Submission Summary

This project covers the core assignment flow:

- Create and switch between chats
- Send messages and receive simulated AI responses
- Edit and delete messages
- Rename and delete chats
- Select between multiple AI engines
