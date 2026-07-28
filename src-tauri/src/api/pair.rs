use axum::{
    extract::State,
    http::StatusCode,
    Json,
};
use std::sync::Arc;
use crate::AppState;
use crate::models::{PairRequest, PairResponse, GeneratePinResponse};

const PIN_GENERATION_COOLDOWN_SECS: i64 = 10;
const PAIRING_MAX_ATTEMPTS: usize = 5;
const PAIRING_WINDOW_SECS: i64 = 60;

pub async fn generate_pin(
    State(state): State<Arc<AppState>>,
) -> Result<Json<GeneratePinResponse>, (StatusCode, String)> {
    let now = chrono::Utc::now().naive_utc();
    {
        let mut last_gen = state.rate_limiter.last_pin_generation.lock().await;
        if let Some(last) = *last_gen {
            let elapsed = (now - last).num_seconds();
            if elapsed < PIN_GENERATION_COOLDOWN_SECS {
                return Err((
                    StatusCode::TOO_MANY_REQUESTS,
                    format!("rate limited: try again in {} seconds", PIN_GENERATION_COOLDOWN_SECS - elapsed),
                ));
            }
        }
        *last_gen = Some(now);
    }

    let pin = format!("{:06}", rand::random::<u32>() % 1_000_000);
    let expires_at = now + chrono::Duration::seconds(60);

    let mut pairing = state.pairing_pin.lock().await;
    *pairing = Some(crate::models::PairingState { pin: pin.clone(), expires_at });

    Ok(Json(GeneratePinResponse { pin }))
}

pub async fn pair(
    State(state): State<Arc<AppState>>,
    Json(req): Json<PairRequest>,
) -> Result<Json<PairResponse>, (StatusCode, String)> {
    let now = chrono::Utc::now().naive_utc();

    {
        let mut attempts = state.rate_limiter.pairing_attempts.lock().await;
        let window_start = now - chrono::Duration::seconds(PAIRING_WINDOW_SECS);
        attempts.retain(|t| *t > window_start);

        if attempts.len() >= PAIRING_MAX_ATTEMPTS {
            let oldest = attempts.first().copied().unwrap_or(now);
            let retry_after = PAIRING_WINDOW_SECS - (now - oldest).num_seconds();
            return Err((
                StatusCode::TOO_MANY_REQUESTS,
                format!("rate limited: try again in {} seconds", retry_after),
            ));
        }
        attempts.push(now);
    }

    let mut pairing = state.pairing_pin.lock().await;

    match pairing.take() {
        Some(ps) if ps.pin == req.pin && chrono::Utc::now().naive_utc() <= ps.expires_at => {
            Ok(Json(PairResponse {
                token: state.auth_token.read().unwrap().clone(),
            }))
        }
        _ => Err((StatusCode::UNAUTHORIZED, "invalid or expired pin".to_string())),
    }
}