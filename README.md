# UXTest Platform

A privacy-first, developer-facing UX testing platform with an embeddable JavaScript SDK, Node.js backend, and React analytics dashboard.

![Architecture](https://img.shields.io/badge/Architecture-Monorepo-blue)
![SDK](https://img.shields.io/badge/SDK-Vanilla%20JS-yellow)
![Backend](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-green)
![Dashboard](https://img.shields.io/badge/Dashboard-React-61dafb)

## 🎯 Overview

UXTest enables task-based usability testing on any website through a lightweight, embeddable SDK. Unlike traditional analytics tools, it focuses on **semantic events** rather than invasive tracking—no mouse coordinates, no keystrokes, no PII.

```
┌─────────────────────────────────────────────────────────────────┐
│                     External Website                             │
│   <script src="uxtest.min.js"></script>                         │
│   UXTest.init({ projectId: 'abc', testId: 'xyz' })              │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Batched Events (fetch)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              Backend (Node.js + Express + SQLite)                │
│   POST /events  │  GET /tests/:id  │  GET /analytics/:testId    │
└──────────────────────────┬──────────────────────────────────────┘
                           │ REST API
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Dashboard (React + Recharts)                  │
│   Test List  │  Metrics  │  A/B Comparison  │  Charts           │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 9+

### Installation

```bash
# Install all dependencies
npm install

# Build the SDK
npm run sdk:build

# Start backend and dashboard
npm run dev
```

This will start:
- **Backend API**: http://localhost:3001
- **Dashboard**: http://localhost:5173
- **Demo page**: Open `demo/index.html` in a browser

### Testing the Demo

1. Open `demo/index.html` in your browser
2. Complete the checkout form (or trigger validation errors)
3. Watch events appear in the debug panel
4. View analytics in the dashboard at http://localhost:5173

## 📦 Project Structure

```
uxtest-platform/
├── sdk/                    # Embeddable JavaScript SDK
│   ├── src/uxtest.js       # SDK source code
│   ├── dist/               # Built IIFE bundle
│   └── build.js            # esbuild configuration
├── backend/                # Node.js API server
│   └── src/
│       ├── index.js        # Express server
│       ├── db/             # SQLite database & schema
│       ├── routes/         # API endpoints
│       └── services/       # Business logic
├── dashboard/              # React analytics UI
│   └── src/
│       ├── pages/          # TestList, TestDetail
│       ├── components/     # Charts, metrics
│       └── api/            # API client
└── demo/                   # Demo website for testing
    └── index.html          # Checkout flow example
```

## 🔧 SDK API

### Initialization

```javascript
UXTest.init({
  projectId: 'your-project-id',  // Required
  testId: 'your-test-id',        // Required
  variant: 'A',                   // Optional: 'A' or 'B'
  endpoint: 'https://api.example.com', // Optional
  batchSize: 5,                   // Optional: events per batch
  flushInterval: 10000            // Optional: ms between flushes
});
```

### Logging Events

```javascript
// Log custom semantic events
UXTest.logEvent('button_click', { buttonId: 'submit' });
UXTest.logEvent('form_submit', { formId: 'checkout' });
UXTest.logEvent('validation_error', { field: 'email' });
UXTest.logEvent('api_error', { endpoint: '/checkout', status: 500 });
```

### Lifecycle Methods

```javascript
// Mark task as successfully completed
UXTest.success({ orderId: '12345' });

// Mark task as abandoned
UXTest.abandon('user_cancelled');
```

### Built-in Event Types

| Event | Description |
|-------|-------------|
| `task_started` | Auto-logged on init |
| `task_completed` | Logged via `UXTest.success()` |
| `task_abandoned` | Logged via `UXTest.abandon()` |
| `validation_error` | Form validation failed |
| `api_error` | API request failed |

## 🛡️ Privacy Principles

- **No mouse coordinates** — We don't track cursor movement
- **No keystrokes** — We don't capture what users type
- **No input values** — Form data stays on the client
- **No PII collection** — Personal data is automatically filtered
- **Semantic events only** — Track *what* happened, not *how*

The SDK sanitizes payloads to remove potential PII:
```javascript
// These keys are automatically stripped:
['email', 'password', 'phone', 'ssn', 'credit', 'card', 'address', 'name', 'ip']
```

## 📊 Analytics Computed

| Metric | Description |
|--------|-------------|
| **Completion Rate** | % of sessions that completed the task |
| **Abandon Rate** | % of sessions that were abandoned |
| **Avg Completion Time** | Mean time to complete (ms) |
| **Median Completion Time** | 50th percentile time (ms) |
| **Error Count** | Total validation/API errors |
| **Time Distribution** | Histogram of completion times |

## 🔌 API Endpoints

### Events
```
POST /events
Body: { events: [{ sessionId, testId, type, payload, timestamp }] }
```

### Tests
```
GET /tests?projectId=demo-project   # List tests
GET /tests/:id                       # Get test config
POST /tests                          # Create test
PATCH /tests/:id                     # Update test
```

### Analytics
```
GET /analytics/:testId               # Get computed analytics
```

## 🧪 A/B Testing

Tests can have multiple variants. The SDK variant is set during initialization:

```javascript
// Variant A (control)
UXTest.init({ projectId: 'p1', testId: 't1', variant: 'A' });

// Variant B (experiment)
UXTest.init({ projectId: 'p1', testId: 't1', variant: 'B' });
```

The dashboard shows side-by-side comparison of variant metrics.

## 🏗️ Technical Decisions

| Decision | Rationale |
|----------|-----------|
| **SQLite** | Simple setup, no external DB needed, easy to swap |
| **IIFE Bundle** | No build step required on host sites |
| **Batch Events** | Reduces network overhead, better offline support |
| **localStorage** | Offline resilience without IndexedDB complexity |
| **On-demand Analytics** | Simpler than pre-aggregation, acceptable for MVP |
| **No Auth** | Portfolio scope; projectId acts as token |

## 📝 Development

```bash
# Run backend only
npm run backend:dev

# Run dashboard only  
npm run dashboard:dev

# Rebuild SDK after changes
npm run sdk:build
```

## 🎓 Interview Talking Points

1. **Privacy-first design**: How we avoid PII collection
2. **Offline resilience**: localStorage queue + retry logic
3. **Batch optimization**: Configurable batch size + interval
4. **Clean architecture**: Service layer separation
5. **A/B testing**: Variant-based analytics aggregation

---

Built as a portfolio project demonstrating full-stack architecture, privacy-conscious design, and clean code principles.
