-- UXTest Database Schema
-- Privacy-first UX testing platform

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Tests table
CREATE TABLE IF NOT EXISTS tests (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  target_url TEXT,
  instructions TEXT,
  timeout_ms INTEGER DEFAULT 300000,
  variants TEXT DEFAULT '["A"]',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Sessions table (one per SDK initialization)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL,
  variant TEXT NOT NULL DEFAULT 'A',
  started_at TEXT NOT NULL,
  ended_at TEXT,
  outcome TEXT,
  duration_ms INTEGER,
  user_agent TEXT,
  screen_width INTEGER,
  screen_height INTEGER,
  language TEXT,
  FOREIGN KEY (test_id) REFERENCES tests(id)
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  type TEXT NOT NULL,
  payload TEXT,
  timestamp INTEGER NOT NULL,
  received_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Tasks table (multiple tasks per test)
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_tasks_test_id ON tasks(test_id);
CREATE INDEX IF NOT EXISTS idx_sessions_test_id ON sessions(test_id);
CREATE INDEX IF NOT EXISTS idx_sessions_outcome ON sessions(outcome);
CREATE INDEX IF NOT EXISTS idx_sessions_test_variant ON sessions(test_id, variant);
CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_tests_project_id ON tests(project_id);
