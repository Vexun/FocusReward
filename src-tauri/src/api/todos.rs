use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use std::sync::Arc;
use crate::AppState;
use crate::models::{Todo, CreateTodoRequest};

#[derive(Deserialize)]
pub struct TodoFilter {
    completed: Option<bool>,
}

pub async fn list_todos(
    State(state): State<Arc<AppState>>,
    Query(filter): Query<TodoFilter>,
) -> Result<Json<Vec<Todo>>, (StatusCode, String)> {
    let db = state.db.lock().await;
    let todos = db.get_todos(filter.completed).map_err(|e| {
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;
    Ok(Json(todos))
}

pub async fn create_todo(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateTodoRequest>,
) -> Result<(StatusCode, Json<Todo>), (StatusCode, String)> {
    if req.title.trim().is_empty() {
        return Err((StatusCode::BAD_REQUEST, "title is required".to_string()));
    }
    if !["easy", "medium", "hard"].contains(&req.difficulty.as_str()) {
        return Err((
            StatusCode::BAD_REQUEST,
            "difficulty must be 'easy', 'medium', or 'hard'".to_string(),
        ));
    }

    let db = state.db.lock().await;
    let todo = db.create_todo(req.title.trim(), &req.difficulty).map_err(|e| {
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;
    Ok((StatusCode::CREATED, Json(todo)))
}

pub async fn complete_todo(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<Todo>, (StatusCode, String)> {
    let mut db = state.db.lock().await;
    let todo = db.complete_todo(&id).map_err(|e| {
        let msg = e.to_string();
        if msg.contains("todo already completed") {
            (StatusCode::CONFLICT, msg)
        } else {
            (StatusCode::INTERNAL_SERVER_ERROR, msg)
        }
    })?;
    Ok(Json(todo))
}

pub async fn delete_todo(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<StatusCode, (StatusCode, String)> {
    let db = state.db.lock().await;
    db.delete_todo(&id).map_err(|e| {
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;
    Ok(StatusCode::NO_CONTENT)
}
