# UXTest Platform

A lightweight, privacy-first UX testing platform for web applications. Embeddable SDK with real-time analytics dashboard.

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![React](https://img.shields.io/badge/React-18-61dafb)
![License](https://img.shields.io/badge/License-MIT-blue)

## Overview

UXTest enables task-based usability testing on any website. The SDK injects a floating widget that guides users through predefined tasks while collecting completion metrics.

**Live Demo:**
- Dashboard: [ux-test-platform-dashboard.vercel.app](https://ux-test-platform-dashboard.vercel.app)
- API: [uxtest-backend.onrender.com](https://uxtest-backend.onrender.com)

## Features

- **Multi-task testing** — Define sequential tasks with progress tracking
- **Cross-page persistence** — Sessions survive page navigations
- **Privacy-first** — No mouse tracking, keystrokes, or PII collection
- **Offline support** — Events queued locally when offline
- **Chrome Extension** — One-click test activation on any site

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Chrome Ext    │     │   Target Site   │     │    Dashboard    │
│   / Bookmarklet │────▶│   + SDK Widget  │     │     (React)     │
└─────────────────┘     └────────┬────────┘     └────────▲────────┘
                                 │                       │
                                 │ Events (AJAX)         │ REST API
                                 ▼                       │
                        ┌────────────────────────────────┴────────┐
                        │        Backend (Node.js + SQLite)       │
                        └─────────────────────────────────────────┘
```

## Quick Start

```bash
# Install dependencies
npm install

# Build SDK
npm run sdk:build

# Start development servers
npm run dev
```

Opens:
- Backend API: http://localhost:3001
- Dashboard: http://localhost:5173

## Project Structure

```
├── sdk/                  # Embeddable JavaScript SDK
│   ├── src/uxtest.js     # Core logic, widget, AJAX
│   └── dist/             # Bundled output (~8KB)
├── backend/              # Express API server
│   ├── src/routes/       # REST endpoints
│   ├── src/services/     # Business logic
│   └── src/db/           # SQLite database
├── dashboard/            # React analytics UI
│   └── src/pages/        # Test management views
├── extension/            # Chrome Extension (MV3)
└── demo/                 # Local test page
```

## SDK Usage

### Via Script Tag

```html
<script src="https://uxtest-backend.onrender.com/sdk/uxtest.min.js"></script>
<script>
  UXTest.init({
    projectId: 'my-project',
    testId: 'test-123',
    variant: 'A',
    endpoint: 'https://uxtest-backend.onrender.com'
  });
</script>
```

### Via Chrome Extension

1. Load `extension/` folder in `chrome://extensions` (Developer mode)
2. Click extension icon on target website
3. Select test and click "Start Test"

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/events` | Batch event ingestion |
| `GET` | `/tests` | List all tests |
| `GET` | `/tests/:id` | Get test with tasks |
| `POST` | `/tests` | Create new test |
| `GET` | `/analytics/:testId` | Get computed metrics |

### Event Payload

```json
{
  "events": [{
    "sessionId": "uuid",
    "testId": "test-123",
    "type": "task_completed",
    "payload": { "taskIndex": 0, "duration": 5420 },
    "timestamp": 1704067200000,
    "url": "https://example.com"
  }]
}
```

## Analytics Metrics

| Metric | Description |
|--------|-------------|
| Completion Rate | Percentage of completed sessions |
| Abandon Rate | Percentage of abandoned sessions |
| Avg Completion Time | Mean task completion time (ms) |
| Median Time | 50th percentile completion time |
| Time Distribution | Histogram of completion times |

## Network Layer

The SDK implements a resilient AJAX strategy:

1. **Primary**: `fetch()` with 5s timeout via AbortController
2. **Fallback**: `XMLHttpRequest` for older browsers
3. **Unload**: `navigator.sendBeacon` for guaranteed delivery
4. **Retry**: Exponential backoff with jitter (max 3 attempts)
5. **Offline**: Events persisted to localStorage

## Deployment

### Backend (Render)

```yaml
services:
  - type: web
    name: uxtest-backend
    buildCommand: npm install && npm run sdk:build
    startCommand: npm run backend:start
```

### Dashboard (Vercel)

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

## Development

```bash
npm run dev              # Start all services
npm run backend:dev      # Backend only (port 3001)
npm run dashboard:dev    # Dashboard only (port 5173)
npm run sdk:build        # Rebuild SDK bundle
```

## Tech Stack

- **SDK**: Vanilla JavaScript, IIFE bundle, esbuild
- **Backend**: Node.js, Express, sql.js (SQLite)
- **Dashboard**: React, Vite, Recharts
- **Extension**: Chrome Extensions Manifest V3
- **Deployment**: Vercel (frontend), Render (backend)

## License

MIT
