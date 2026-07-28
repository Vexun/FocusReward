pub const MIGRATION_001: &str = "
CREATE TABLE IF NOT EXISTS todos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    points INTEGER NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reward_sites (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    is_preconfigured INTEGER NOT NULL DEFAULT 0,
    timed_cost INTEGER NOT NULL,
    timed_duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (timed_duration_minutes <= 1440),
    icon TEXT
);

CREATE TABLE IF NOT EXISTS unlock_sessions (
    id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL REFERENCES reward_sites(id),
    points_spent INTEGER NOT NULL,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS point_transactions (
    id TEXT PRIMARY KEY,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('earned', 'spent')),
    todo_id TEXT REFERENCES todos(id),
    unlock_session_id TEXT REFERENCES unlock_sessions(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
";
