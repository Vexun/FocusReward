mod health;
mod todos;
mod sites;
mod unlocks;
mod points;
mod extension;

use axum::{Router, routing::{get, post, patch, delete}};
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use crate::AppState;
use crate::config::Config;

pub fn create_router(state: Arc<AppState>, config: &Config) -> Router {
    let frontend_path = config.frontend_path.clone();

    Router::new()
        .route("/api/health", get(health::health))
        .route("/api/todos", get(todos::list_todos).post(todos::create_todo))
        .route("/api/todos/{id}/complete", patch(todos::complete_todo))
        .route("/api/todos/{id}", delete(todos::delete_todo))
        .route("/api/sites", get(sites::list_sites).post(sites::create_site))
        .route("/api/sites/{id}", delete(sites::delete_site))
        .route("/api/unlock/timed", post(unlocks::timed_unlock))
        .route("/api/points/balance", get(points::balance))
        .route("/api/points/history", get(points::history))
        .route("/api/extension/active-unlocks", get(extension::active_unlocks))
        .fallback_service(
            tower_http::services::ServeDir::new(&frontend_path)
                .append_index_html_on_directories(true)
                .precompressed_br()
                .precompressed_gzip()
                .precompressed_deflate()
                .not_found_service(
                    tower_http::services::ServeDir::new(&frontend_path.join("index.html"))
                )
        )
        .layer(CorsLayer::permissive())
        .with_state(state)
}
