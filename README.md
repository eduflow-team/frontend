# EduFlow Frontend

React + Vite frontend for **EduFlow** — teacher and student flows with routing, auth context, and a shared API client.

## Prerequisites

- Node.js 18+ (recommended)
- npm

## Setup

```bash
npm install
```

## Environment

Copy `.env.example` to `.env.local` (or `.env`) and set the backend base URL:

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Backend API base path (e.g. `/api/v1` for Vite dev proxy, or full URL in production) |

## Development

```bash
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`).

## Build

```bash
npm run build
```

Production output is written to `dist/`.
