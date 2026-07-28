mod migrations;

use rusqlite::{Connection, params};
use std::path::Path;
use crate::models::*;

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn open(path: &Path) -> Result<Self, rusqlite::Error> {
        let conn = Connection::open(path)?;
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
        let mut db = Database { conn };
        db.run_migrations()?;
        Ok(db)
    }

    fn run_migrations(&mut self) -> Result<(), rusqlite::Error> {
        let user_version: i64 = self.conn.pragma_query_value(None, "user_version", |r| r.get(0))?;

        if user_version < 1 {
            self.conn.execute_batch(migrations::MIGRATION_001)?;
            self.conn.pragma_update(None, "user_version", 1)?;
        }

        if user_version < 2 {
            let count: i64 = self
                .conn
                .query_row("SELECT COUNT(*) FROM reward_sites", [], |r| r.get(0))?;
            if count == 0 {
                self.seed_sites()?;
            }
            self.conn.pragma_update(None, "user_version", 2)?;
        }

        Ok(())
    }

    fn seed_sites(&self) -> Result<(), rusqlite::Error> {
        let sites = vec![
            ("youtube", "youtube.com", "YouTube", true, 15, 30),
            ("reddit", "reddit.com", "Reddit", true, 10, 30),
            ("twitter", "twitter.com", "Twitter", true, 10, 30),
            ("instagram", "instagram.com", "Instagram", true, 10, 30),
            ("twitch", "twitch.tv", "Twitch", true, 15, 30),
        ];

        let mut stmt = self.conn.prepare(
            "INSERT OR IGNORE INTO reward_sites (id, url, name, is_preconfigured, timed_cost, timed_duration_minutes)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        )?;

        for (id, url, name, preconf, cost, duration) in sites {
            stmt.execute(params![id, url, name, preconf as i64, cost, duration])?;
        }

        Ok(())
    }

    pub fn get_todos(&self, completed: Option<bool>) -> Result<Vec<Todo>, rusqlite::Error> {
        let mut sql = String::from(
            "SELECT id, title, difficulty, points, completed, completed_at, created_at FROM todos",
        );

        if let Some(val) = completed {
            sql.push_str(" WHERE completed = ?1");
            let mut stmt = self.conn.prepare(&sql)?;
            let rows = stmt.query_map(params![val as i64], |r| {
                Ok(Todo {
                    id: r.get(0)?,
                    title: r.get(1)?,
                    difficulty: r.get(2)?,
                    points: r.get(3)?,
                    completed: r.get::<_, i64>(4)? != 0,
                    completed_at: r.get(5)?,
                    created_at: r.get(6)?,
                })
            })?;
            let mut todos = Vec::new();
            for row in rows {
                todos.push(row?);
            }
            return Ok(todos);
        }

        sql.push_str(" ORDER BY created_at DESC");
        let mut stmt = self.conn.prepare(&sql)?;
        let rows = stmt.query_map([], |r| {
            Ok(Todo {
                id: r.get(0)?,
                title: r.get(1)?,
                difficulty: r.get(2)?,
                points: r.get(3)?,
                completed: r.get::<_, i64>(4)? != 0,
                completed_at: r.get(5)?,
                created_at: r.get(6)?,
            })
        })?;

        let mut todos = Vec::new();
        for row in rows {
            todos.push(row?);
        }
        Ok(todos)
    }

    pub fn create_todo(&self, title: &str, difficulty: &str) -> Result<Todo, rusqlite::Error> {
        let id = uuid::Uuid::new_v4().to_string();
        let points = match difficulty {
            "easy" => 5,
            "hard" => 20,
            _ => 10,
        };

        self.conn.execute(
            "INSERT INTO todos (id, title, difficulty, points) VALUES (?1, ?2, ?3, ?4)",
            params![id, title, difficulty, points],
        )?;

        let todo = self.conn.query_row(
            "SELECT id, title, difficulty, points, completed, completed_at, created_at FROM todos WHERE id = ?1",
            params![id],
            |r| {
                Ok(Todo {
                    id: r.get(0)?,
                    title: r.get(1)?,
                    difficulty: r.get(2)?,
                    points: r.get(3)?,
                    completed: r.get::<_, i64>(4)? != 0,
                    completed_at: r.get(5)?,
                    created_at: r.get(6)?,
                })
            },
        )?;

        Ok(todo)
    }

    pub fn complete_todo(&mut self, id: &str) -> Result<Todo, rusqlite::Error> {
        let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

        let points: i64 = self.conn.query_row(
            "SELECT points FROM todos WHERE id = ?1",
            params![id],
            |r| r.get(0),
        )?;

        self.conn.execute(
            "UPDATE todos SET completed = 1, completed_at = ?1 WHERE id = ?2",
            params![now, id],
        )?;

        let tx_id = uuid::Uuid::new_v4().to_string();
        self.conn.execute(
            "INSERT INTO point_transactions (id, amount, type, todo_id) VALUES (?1, ?2, 'earned', ?3)",
            params![tx_id, points, id],
        )?;

        let todo = self.conn.query_row(
            "SELECT id, title, difficulty, points, completed, completed_at, created_at FROM todos WHERE id = ?1",
            params![id],
            |r| {
                Ok(Todo {
                    id: r.get(0)?,
                    title: r.get(1)?,
                    difficulty: r.get(2)?,
                    points: r.get(3)?,
                    completed: r.get::<_, i64>(4)? != 0,
                    completed_at: r.get(5)?,
                    created_at: r.get(6)?,
                })
            },
        )?;

        Ok(todo)
    }

    pub fn delete_todo(&self, id: &str) -> Result<(), rusqlite::Error> {
        self.conn
            .execute("DELETE FROM todos WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn get_sites(&self) -> Result<Vec<RewardSite>, rusqlite::Error> {
        let mut stmt = self.conn.prepare(
            "SELECT id, url, name, is_preconfigured, timed_cost, timed_duration_minutes, icon FROM reward_sites ORDER BY name",
        )?;
        let rows = stmt.query_map([], |r| {
            Ok(RewardSite {
                id: r.get(0)?,
                url: r.get(1)?,
                name: r.get(2)?,
                is_preconfigured: r.get::<_, i64>(3)? != 0,
                timed_cost: r.get(4)?,
                timed_duration_minutes: r.get(5)?,
                icon: r.get(6)?,
            })
        })?;

        let mut sites = Vec::new();
        for row in rows {
            sites.push(row?);
        }
        Ok(sites)
    }

    pub fn create_site(&self, req: &CreateSiteRequest) -> Result<RewardSite, rusqlite::Error> {
        let id = uuid::Uuid::new_v4().to_string();
        self.conn.execute(
            "INSERT INTO reward_sites (id, url, name, is_preconfigured, timed_cost, timed_duration_minutes) VALUES (?1, ?2, ?3, 0, ?4, ?5)",
            params![id, req.url, req.name, req.timed_cost, req.timed_duration_minutes],
        )?;

        let site = self.conn.query_row(
            "SELECT id, url, name, is_preconfigured, timed_cost, timed_duration_minutes, icon FROM reward_sites WHERE id = ?1",
            params![id],
            |r| {
                Ok(RewardSite {
                    id: r.get(0)?,
                    url: r.get(1)?,
                    name: r.get(2)?,
                    is_preconfigured: r.get::<_, i64>(3)? != 0,
                    timed_cost: r.get(4)?,
                    timed_duration_minutes: r.get(5)?,
                    icon: r.get(6)?,
                })
            },
        )?;

        Ok(site)
    }

    pub fn delete_site(&self, id: &str) -> Result<(), rusqlite::Error> {
        let preconf: bool = self.conn.query_row(
            "SELECT is_preconfigured FROM reward_sites WHERE id = ?1",
            params![id],
            |r| Ok(r.get::<_, i64>(0)? != 0),
        )?;

        if preconf {
            return Err(rusqlite::Error::ToSqlConversionFailure(Box::new(
                std::io::Error::new(std::io::ErrorKind::Other, "preconfigured sites cannot be deleted"),
            )));
        }

        self.conn.execute(
            "DELETE FROM reward_sites WHERE id = ?1",
            params![id],
        )?;
        Ok(())
    }

    pub fn start_timed_unlock(
        &mut self,
        site_id: &str,
        duration_minutes: i64,
    ) -> Result<UnlockSession, rusqlite::Error> {
        let cost: i64 = self.conn.query_row(
            "SELECT timed_cost FROM reward_sites WHERE id = ?1",
            params![site_id],
            |r| r.get(0),
        )?;

        let balance = self.get_balance()?;
        if balance < cost {
            return Err(rusqlite::Error::ToSqlConversionFailure(Box::new(
                std::io::Error::new(std::io::ErrorKind::Other, "insufficient points"),
            )));
        }

        let now = chrono::Utc::now();
        let now_str = now.format("%Y-%m-%d %H:%M:%S").to_string();

        let existing: Option<(String, String)> = self
            .conn
            .query_row(
                "SELECT id, expires_at FROM unlock_sessions WHERE site_id = ?1 AND active = 1 AND expires_at > ?2",
                params![site_id, now_str],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .ok();

        let (session_id, _expires_at) = if let Some((existing_id, existing_expires)) = existing {
            let base = chrono::NaiveDateTime::parse_from_str(
                &existing_expires,
                "%Y-%m-%d %H:%M:%S",
            )
            .unwrap_or(now.naive_utc());
            let base = if base < now.naive_utc() { now.naive_utc() } else { base };
            let new_expires = base + chrono::Duration::minutes(duration_minutes);
            let expires_str = new_expires.format("%Y-%m-%d %H:%M:%S").to_string();

            self.conn.execute(
                "UPDATE unlock_sessions SET expires_at = ?1, active = 1 WHERE id = ?2",
                params![expires_str, existing_id],
            )?;

            let tx_id = uuid::Uuid::new_v4().to_string();
            self.conn.execute(
                "INSERT INTO point_transactions (id, amount, type, unlock_session_id) VALUES (?1, ?2, 'spent', ?3)",
                params![tx_id, cost, existing_id],
            )?;

            (existing_id, expires_str)
        } else {
            let new_id = uuid::Uuid::new_v4().to_string();
            let expires = now.naive_utc() + chrono::Duration::minutes(duration_minutes);
            let expires_str = expires.format("%Y-%m-%d %H:%M:%S").to_string();

            self.conn.execute(
                "INSERT INTO unlock_sessions (id, site_id, points_spent, started_at, expires_at, active) VALUES (?1, ?2, ?3, ?4, ?5, 1)",
                params![new_id, site_id, cost, now_str, expires_str],
            )?;

            let tx_id = uuid::Uuid::new_v4().to_string();
            self.conn.execute(
                "INSERT INTO point_transactions (id, amount, type, unlock_session_id) VALUES (?1, ?2, 'spent', ?3)",
                params![tx_id, cost, new_id],
            )?;

            (new_id, expires_str)
        };

        let session = self.conn.query_row(
            "SELECT id, site_id, points_spent, started_at, expires_at, active FROM unlock_sessions WHERE id = ?1",
            params![session_id],
            |r| {
                Ok(UnlockSession {
                    id: r.get(0)?,
                    site_id: r.get(1)?,
                    points_spent: r.get(2)?,
                    started_at: r.get(3)?,
                    expires_at: r.get(4)?,
                    active: r.get::<_, i64>(5)? != 0,
                })
            },
        )?;

        Ok(session)
    }

    pub fn get_balance(&self) -> Result<i64, rusqlite::Error> {
        let earned: i64 = self
            .conn
            .query_row(
                "SELECT COALESCE(SUM(amount), 0) FROM point_transactions WHERE type = 'earned'",
                [],
                |r| r.get(0),
            )
            .unwrap_or(0);

        let spent: i64 = self
            .conn
            .query_row(
                "SELECT COALESCE(SUM(amount), 0) FROM point_transactions WHERE type = 'spent'",
                [],
                |r| r.get(0),
            )
            .unwrap_or(0);

        Ok(earned - spent)
    }

    pub fn get_transactions(&self) -> Result<Vec<PointTransaction>, rusqlite::Error> {
        let mut stmt = self.conn.prepare(
            "SELECT id, amount, type, todo_id, unlock_session_id, created_at FROM point_transactions ORDER BY created_at DESC LIMIT 100",
        )?;
        let rows = stmt.query_map([], |r| {
            Ok(PointTransaction {
                id: r.get(0)?,
                amount: r.get(1)?,
                r#type: r.get(2)?,
                todo_id: r.get(3)?,
                unlock_session_id: r.get(4)?,
                created_at: r.get(5)?,
            })
        })?;

        let mut txs = Vec::new();
        for row in rows {
            txs.push(row?);
        }
        Ok(txs)
    }

    pub fn get_active_unlocks(&self) -> Result<Vec<ActiveUnlock>, rusqlite::Error> {
        let now = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

        let mut stmt = self.conn.prepare(
            "SELECT rs.url, rs.name, us.expires_at
             FROM unlock_sessions us
             JOIN reward_sites rs ON rs.id = us.site_id
             WHERE us.active = 1 AND us.expires_at > ?1
             ORDER BY us.expires_at ASC",
        )?;
        let rows = stmt.query_map(params![now], |r| {
            Ok(ActiveUnlock {
                url: r.get(0)?,
                name: r.get(1)?,
                expires_at: r.get(2)?,
            })
        })?;

        let mut unlocks = Vec::new();
        for row in rows {
            unlocks.push(row?);
        }
        Ok(unlocks)
    }

    pub fn get_site_cost_and_duration(
        &self,
        site_id: &str,
    ) -> Result<(i64, i64), rusqlite::Error> {
        self.conn.query_row(
            "SELECT timed_cost, timed_duration_minutes FROM reward_sites WHERE id = ?1",
            params![site_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
    }
}
