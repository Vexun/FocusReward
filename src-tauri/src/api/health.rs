use axum::Json;
use crate::models::HealthResponse;

pub async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        app: "focusreward".to_string(),
    })
}
