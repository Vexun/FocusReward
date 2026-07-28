use axum::{
    extract::State,
    http::StatusCode,
    Json,
};
use std::sync::Arc;
use crate::AppState;
use crate::models::ActiveUnlock;

pub async fn active_unlocks(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<ActiveUnlock>>, (StatusCode, String)> {
    let db = state.db.lock().await;
    let unlocks = db.get_active_unlocks().map_err(|e| {
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;
    Ok(Json(unlocks))
}
