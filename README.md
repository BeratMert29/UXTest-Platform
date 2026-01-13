# UXTest Platform

A privacy-first, developer-facing UX testing platform featuring a production-ready JavaScript SDK with robust AJAX handling, Node.js backend, React analytics dashboard, and Chrome Extension for seamless cross-page testing.

![Architecture](https://img.shields.io/badge/Architecture-Monorepo-blue)
![SDK](https://img.shields.io/badge/SDK-Vanilla%20JS-yellow)
![Backend](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-green)
![Dashboard](https://img.shields.io/badge/Dashboard-React-61dafb)
![Deployed](https://img.shields.io/badge/Deployed-Vercel%20%2B%20Render-purple)

## 🎯 Overview

UXTest enables **multi-task usability testing** on any website through a lightweight, embeddable SDK. Unlike traditional analytics tools, it focuses on **semantic events** rather than invasive tracking—no mouse coordinates, no keystrokes, no PII.

### Live Demo
- **Dashboard**: [ux-test-platform-dashboard.vercel.app](https://ux-test-platform-dashboard.vercel.app)
- **Backend API**: [uxtest-backend.onrender.com](https://uxtest-backend.onrender.com)

```
┌─────────────────────────────────────────────────────────────────┐
│                Chrome Extension / Bookmarklet                    │
│   Injects SDK → Persists across page navigations                │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                     Target Website                               │
│   Floating Widget: Task instructions + Progress bar              │
│   [Done] [Skip] buttons for user interaction                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Batched Events (AJAX)
                           │ • fetch() primary
                           │ • XMLHttpRequest fallback
                           │ • navigator.sendBeacon on unload
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              Backend (Node.js + Express + SQLite)                │
│   POST /events  │  GET /tests/:id  │  GET /analytics/:testId    │
│   CORS enabled  │  SDK static hosting                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │ REST API
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Dashboard (React + Recharts)                  │
│   Test Creation │ Tester Portal │ Real-time Analytics           │
└─────────────────────────────────────────────────────────────────┘
```

## ⚡ Key Features

### Robust AJAX Implementation
```javascript
// Multi-layer transport strategy
1. fetch() API (primary) with timeout & retry
2. XMLHttpRequest (fallback for older browsers)
3. navigator.sendBeacon (guaranteed delivery on page unload)
```

- **Exponential backoff** with jitter for failed requests
- **Request timeout** (5s) to prevent hanging connections
- **Offline queue** persisted to localStorage
- **Automatic retry** on network failure (max 3 attempts)

### Multi-Task Testing
- Define multiple tasks per test
- Progress bar showing completion status
- "Done" / "Skip" buttons for each task
- Session persistence across page navigations

### Chrome Extension
- One-click test activation
- Widget persists across all page navigations
- No bookmarklet re-clicking needed
- Works on any HTTPS website

### Privacy-First Design
| What We Track | What We DON'T Track |
|---------------|---------------------|
| Task completion times | Mouse coordinates |
| Error counts | Keystrokes |
| Navigation patterns | Form input values |
| Semantic events | Personal information |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 9+

### Installation

```bash
# Clone and install
git clone <repo-url>
cd uxtest-platform
npm install

# Build the SDK
npm run sdk:build

# Start backend and dashboard
npm run dev
```

This starts:
- **Backend API**: http://localhost:3001
- **Dashboard**: http://localhost:5173
- **Demo page**: Open `demo/index.html` in browser

## 📦 Project Structure

```
uxtest-platform/
├── sdk/                        # Embeddable JavaScript SDK
│   ├── src/uxtest.js           # Core SDK with AJAX, widget, session
│   ├── dist/                   # Built IIFE bundle (~8KB minified)
│   └── build.js                # esbuild configuration
├── backend/                    # Node.js API server
│   ├── src/
│   │   ├── index.js            # Express + CORS + static SDK hosting
│   │   ├── db/                 # SQLite with sql.js (pure JS)
│   │   ├── routes/             # REST API endpoints
│   │   └── services/           # Event processing, analytics
│   └── public/sdk/             # Hosted SDK for bookmarklet
├── dashboard/                  # React analytics UI
│   ├── src/
│   │   ├── pages/              # TestList, TestDetail, CreateTest
│   │   ├── components/         # Charts, MetricsGrid
│   │   ├── api/client.js       # API client with caching
│   │   └── hooks/usePolling.js # Smart polling with visibility
│   └── vercel.json             # SPA routing config
├── extension/                  # Chrome Extension
│   ├── manifest.json           # MV3 configuration
│   ├── popup.html/js           # Test selection UI
│   ├── content.js              # SDK injection
│   └── background.js           # State management
└── demo/                       # Local testing page
```

## 🔧 SDK Architecture

### AJAX Transport Layer

```javascript
// Primary: fetch() with timeout
const controller = new AbortController();
setTimeout(() => controller.abort(), 5000);
const response = await fetch(endpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ events }),
  signal: controller.signal
});

// Fallback: XMLHttpRequest for legacy browsers
if (!window.fetch) {
  const xhr = new XMLHttpRequest();
  xhr.timeout = 5000;
  // ... implementation
}

// Unload: sendBeacon for guaranteed delivery
window.addEventListener('beforeunload', () => {
  if (queue.length > 0) {
    navigator.sendBeacon(endpoint, JSON.stringify({ events: queue }));
  }
});
```

### Retry Strategy

```javascript
// Exponential backoff with jitter
const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
const jitter = delay * 0.1 * Math.random();
await sleep(delay + jitter);
```

### Session Persistence

```javascript
// Stored in localStorage for cross-page continuity
{
  sessionId: "uuid-v4",
  testId: "test-123",
  projectId: "demo-project",
  currentTaskIndex: 2,
  taskStartTime: 1704067200000,
  startTime: 1704067000000
}
```

### Floating Widget

```
┌──────────────────────────────────────┐
│ 📋 Task 2 of 5                       │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │  ← Progress bar
│ Add item to shopping cart            │  ← Task description
│                                      │
│     [ Done ✓ ]    [ Skip → ]         │  ← Action buttons
└──────────────────────────────────────┘
```

## 🌐 Deployment

### Backend (Render)

```yaml
# render.yaml
services:
  - type: web
    name: uxtest-backend
    runtime: node
    buildCommand: npm install && npm run sdk:build
    startCommand: npm run backend:start
    envVars:
      - key: NODE_ENV
        value: production
```

### Dashboard (Vercel)

```json
// vercel.json - SPA routing
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Environment Variables

| Variable | Dashboard | Backend |
|----------|-----------|---------|
| `VITE_API_URL` | Backend URL | - |
| `NODE_ENV` | - | production |
| `PORT` | - | 3001 (default) |

## 📊 Analytics Computed

| Metric | Description |
|--------|-------------|
| **Completion Rate** | % of sessions that completed all tasks |
| **Abandon Rate** | % of sessions abandoned mid-test |
| **Avg Completion Time** | Mean time to complete (ms) |
| **Median Completion Time** | 50th percentile (ms) |
| **Error Count** | Total validation/API errors |
| **Time Distribution** | Histogram buckets for completion times |
| **Per-Task Metrics** | Individual task completion stats |

## 🔌 API Reference

### Events Ingestion
```http
POST /events
Content-Type: application/json

{
  "events": [
    {
      "sessionId": "uuid",
      "testId": "test-123",
      "projectId": "demo-project",
      "variant": "A",
      "type": "task_completed",
      "payload": { "taskIndex": 0, "duration": 5420 },
      "timestamp": "2024-01-01T12:00:00.000Z",
      "url": "https://example.com/checkout"
    }
  ]
}
```

### Test Management
```http
GET /tests?projectId=demo-project    # List tests
GET /tests/:id                        # Get test with tasks
POST /tests                           # Create new test
PATCH /tests/:id                      # Update test
```

### Analytics
```http
GET /analytics/:testId                # Computed metrics
```

## 🧩 Chrome Extension

The extension solves the **bookmarklet limitation** where the SDK widget disappears on page navigation.

### Installation
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" → Select `extension/` folder

### How It Works
```
popup.js           content.js           SDK
    │                   │                │
    │ Start Test        │                │
    ├──────────────────►│                │
    │                   │ Inject SDK     │
    │                   ├───────────────►│
    │                   │                │ Widget appears
    │                   │                │
    │     (page navigation)              │
    │                   │                │
    │                   │ Re-inject SDK  │
    │                   ├───────────────►│
    │                   │                │ Widget resumes
```

## 🏗️ Technical Decisions

| Decision | Rationale |
|----------|-----------|
| **sql.js** | Pure JS SQLite—no native compilation issues |
| **IIFE Bundle** | Single `<script>` tag, no build step on host |
| **Batch Events** | Reduces requests, better offline support |
| **localStorage** | Simple persistence without IndexedDB complexity |
| **sendBeacon** | Guaranteed delivery even on tab close |
| **Chrome Extension** | Seamless cross-page experience for testers |
| **Vercel + Render** | Free tier deployment for portfolio projects |

## 🎓 Interview Talking Points

### 1. AJAX & Network Resilience
"I implemented a multi-layer transport strategy: fetch() as primary with AbortController for timeouts, XMLHttpRequest fallback for legacy browsers, and navigator.sendBeacon for guaranteed delivery on page unload. Failed requests retry with exponential backoff and jitter to prevent thundering herd."

### 2. Privacy-First Architecture
"The SDK only captures semantic events—no mouse coordinates, keystrokes, or form values. We sanitize payloads to strip PII fields like email, password, and phone. This is GDPR-friendly by design."

### 3. Session Persistence
"Cross-page session continuity was challenging with bookmarklets. I store session state in localStorage and resume on re-injection. The Chrome Extension takes this further by automatically re-injecting the SDK on every navigation."

### 4. Full-Stack Deployment
"Backend on Render with automatic builds, dashboard on Vercel with SPA routing configured. CORS is set to allow cross-origin SDK injection from any website."

### 5. Real-Time Analytics
"The dashboard polls the backend with smart caching—instant cache hits with background refresh. Visibility API pauses polling when the tab is hidden to save resources."

## 📝 Development Commands

```bash
# Full development
npm run dev                 # Backend + Dashboard

# Individual services
npm run backend:dev         # Backend only (port 3001)
npm run dashboard:dev       # Dashboard only (port 5173)

# Build
npm run sdk:build           # Rebuild SDK bundle
npm run dashboard:build     # Production dashboard build
```

## 📄 License

MIT — Built as a portfolio project demonstrating full-stack architecture, robust networking, privacy-conscious design, and production deployment practices.

---

**Tech Stack**: JavaScript (ES6+) · Node.js · Express · React · SQLite · Vite · esbuild · Chrome Extensions API · Vercel · Render
