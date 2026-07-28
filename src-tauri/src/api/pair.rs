use axum::{
    extract::State,
    http::StatusCode,
    Json,
};
use std::sync::Arc;
use crate::AppState;
use crate::models::{PairRequest, PairResponse, GeneratePinResponse};

pub async fn generate_pin(
    State(state): State<Arc<AppState>>,
) -> Result<Json<GeneratePinResponse>, (StatusCode, String)> {
    let pin = format!("{:06}", rand::random::<u32>() % 1_000_000);
    let expires_at = chrono::Utc::now().naive_utc() + chrono::Duration::seconds(60);

    let mut pairing = state.pairing_pin.lock().await;
    *pairing = Some(crate::models::PairingState { pin: pin.clone(), expires_at });

    Ok(Json(GeneratePinResponse { pin }))
}

pub async fn pair(
    State(state): State<Arc<AppState>>,
    Json(req): Json<PairRequest>,
) -> Result<Json<PairResponse>, (StatusCode, String)> {
    let mut pairing = state.pairing_pin.lock().await;

    match pairing.take() {
        Some(ps) if ps.pin == req.pin && chrono::Utc::now().naive_utc() <= ps.expires_at => {
            Ok(Json(PairResponse {
                token: state.auth_token.clone(),
            }))
        }
        _ => Err((StatusCode::UNAUTHORIZED, "invalid or expired pin".to_string())),
    }
}
