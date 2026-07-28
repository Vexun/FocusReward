use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Todo {
    pub id: String,
    pub title: String,
    pub difficulty: String,
    pub points: i64,
    pub completed: bool,
    pub completed_at: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateTodoRequest {
    pub title: String,
    pub difficulty: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RewardSite {
    pub id: String,
    pub url: String,
    pub name: String,
    pub is_preconfigured: bool,
    pub timed_cost: i64,
    pub timed_duration_minutes: i64,
    pub icon: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSiteRequest {
    pub url: String,
    pub name: String,
    pub timed_cost: i64,
    pub timed_duration_minutes: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UnlockSession {
    pub id: String,
    pub site_id: String,
    pub points_spent: i64,
    pub started_at: String,
    pub expires_at: String,
    pub active: bool,
}

#[derive(Debug, Deserialize)]
pub struct UnlockRequest {
    pub site_id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PointTransaction {
    pub id: String,
    pub amount: i64,
    pub r#type: String,
    pub todo_id: Option<String>,
    pub unlock_session_id: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct PointBalance {
    pub balance: i64,
}

#[derive(Debug, Serialize)]
pub struct ActiveUnlock {
    pub url: String,
    pub name: String,
    pub expires_at: String,
}

#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub app: String,
}
