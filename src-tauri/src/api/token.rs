use axum::{
    extract::State,
    http::StatusCode,
    Json,
};
use std::sync::Arc;
use crate::AppState;
use crate::models::ResetTokenResponse;
use crate::config::set_restrictive_permissions;

pub async fn reset_token(
    State(state): State<Arc<AppState>>,
) -> Result<Json<ResetTokenResponse>, (StatusCode, String)> {
    let new_token = uuid::Uuid::new_v4().to_string();

    std::fs::write(&state.token_path, &new_token)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("failed to write token: {}", e)))?;

    set_restrictive_permissions(&state.token_path);

    *state.auth_token.write().unwrap() = new_token.clone();

    Ok(Json(ResetTokenResponse { token: new_token }))
}