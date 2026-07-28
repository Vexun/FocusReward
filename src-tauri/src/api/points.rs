use axum::{
    extract::State,
    http::StatusCode,
    Json,
};
use std::sync::Arc;
use crate::AppState;
use crate::models::{PointBalance, PointTransaction};

pub async fn balance(
    State(state): State<Arc<AppState>>,
) -> Result<Json<PointBalance>, (StatusCode, String)> {
    let db = state.db.lock().await;
    let balance = db.get_balance().map_err(|e| {
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;
    Ok(Json(PointBalance { balance }))
}

pub async fn history(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<PointTransaction>>, (StatusCode, String)> {
    let db = state.db.lock().await;
    let txs = db.get_transactions().map_err(|e| {
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;
    Ok(Json(txs))
}
