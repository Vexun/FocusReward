use axum::{extract::State, Json};
use std::sync::Arc;
use crate::AppState;
use crate::models::HealthResponse;

pub async fn health(
    State(state): State<Arc<AppState>>,
) -> Json<HealthResponse> {
    Json(HealthResponse {
        app: "focusreward".to_string(),
        token: state.auth_token.clone(),
    })
}
