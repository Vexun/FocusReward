use axum::{
    extract::State,
    http::StatusCode,
    Json,
};
use std::sync::Arc;
use crate::AppState;
use crate::models::{UnlockRequest, UnlockSession};

pub async fn timed_unlock(
    State(state): State<Arc<AppState>>,
    Json(req): Json<UnlockRequest>,
) -> Result<Json<UnlockSession>, (StatusCode, String)> {
    let mut db = state.db.lock().await;

    let (_, duration) = db.get_site_cost_and_duration(&req.site_id).map_err(|_| {
        (StatusCode::NOT_FOUND, "site not found".to_string())
    })?;

    let session = db
        .start_timed_unlock(&req.site_id, duration)
        .map_err(|e| {
            let msg = e.to_string();
            if msg.contains("insufficient points") {
                (StatusCode::BAD_REQUEST, msg)
            } else {
                (StatusCode::INTERNAL_SERVER_ERROR, msg)
            }
        })?;

    Ok(Json(session))
}
