mod health;
mod todos;
mod sites;
mod unlocks;
mod points;
mod extension;
mod pair;

use axum::{
    Router,
    middleware,
    routing::{get, post, patch, delete},
    http::{Request, StatusCode, Method},
    response::Response,
    body::Body,
    extract::State,
};
use std::sync::Arc;
use tower_http::cors::{CorsLayer, AllowOrigin, AllowMethods, AllowHeaders};
use tower_http::services::{ServeDir, ServeFile};
use tower::ServiceBuilder;
use crate::AppState;
use crate::config::Config;

async fn auth_middleware(
    State(state): State<Arc<AppState>>,
    req: Request<Body>,
    next: middleware::Next,
) -> Result<Response, (StatusCode, String)> {
    if req.method() == Method::OPTIONS {
        return Ok(next.run(req).await);
    }

    let path = req.uri().path().to_string();

    if path == "/api/health" || path == "/api/pair" {
        return Ok(next.run(req).await);
    }

    if path.starts_with("/api/") {
        let token = req
            .headers()
            .get("X-FocusReward-Token")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("");

        if token != state.auth_token {
            return Err((StatusCode::UNAUTHORIZED, "invalid token".to_string()));
        }
    }

    Ok(next.run(req).await)
}

pub fn create_router(state: Arc<AppState>, config: &Config) -> Router {
    let frontend_path = config.frontend_path.clone();
    let origin_str = format!("http://127.0.0.1:{}", config.port);

    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::exact(origin_str.parse().unwrap()))
        .allow_methods(AllowMethods::any())
        .allow_headers(AllowHeaders::any());

    let api_routes = Router::new()
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
        .route("/api/pair/generate", post(pair::generate_pin))
        .route("/api/pair", post(pair::pair))
        .layer(ServiceBuilder::new()
            .layer(middleware::from_fn_with_state(state.clone(), auth_middleware))
            .layer(cors)
        );

    let static_routes = Router::new()
        .fallback_service(
            ServeDir::new(&frontend_path)
                .append_index_html_on_directories(true)
                .fallback(ServeFile::new(frontend_path.join("404.html")))
        );

    Router::new()
        .merge(api_routes)
        .merge(static_routes)
        .with_state(state)
}
