use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use std::sync::Arc;
use crate::AppState;
use crate::models::{RewardSite, CreateSiteRequest};

pub async fn list_sites(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<RewardSite>>, (StatusCode, String)> {
    let db = state.db.lock().await;
    let sites = db.get_sites().map_err(|e| {
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;
    Ok(Json(sites))
}

pub async fn create_site(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateSiteRequest>,
) -> Result<(StatusCode, Json<RewardSite>), (StatusCode, String)> {
    if req.name.trim().is_empty() || req.url.trim().is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "name and url are required".to_string(),
        ));
    }
    if req.timed_cost <= 0 {
        return Err((
            StatusCode::BAD_REQUEST,
            "timed_cost must be positive".to_string(),
        ));
    }
    if req.timed_duration_minutes <= 0 || req.timed_duration_minutes > 1440 {
        return Err((
            StatusCode::BAD_REQUEST,
            "timed_duration_minutes must be between 1 and 1440".to_string(),
        ));
    }

    let db = state.db.lock().await;
    let site = db.create_site(&req).map_err(|e| {
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;
    Ok((StatusCode::CREATED, Json(site)))
}

pub async fn delete_site(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    let db = state.db.lock().await;
    db.delete_site(&id).map_err(|e| {
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;
    Ok(StatusCode::NO_CONTENT)
}
