pub mod config;
pub mod models;
pub mod db;
pub mod api;

use config::Config;
use db::Database;
use api::create_router;
use models::PairingState;

use std::sync::Arc;
use tokio::sync::Mutex;
use chrono::NaiveDateTime;

pub struct RateLimitState {
    pub last_pin_generation: Mutex<Option<NaiveDateTime>>,
    pub pairing_attempts: Mutex<Vec<NaiveDateTime>>,
}

impl RateLimitState {
    pub fn new() -> Self {
        Self {
            last_pin_generation: Mutex::new(None),
            pairing_attempts: Mutex::new(Vec::new()),
        }
    }
}

pub struct AppState {
    pub db: Arc<Mutex<Database>>,
    pub auth_token: String,
    pub pairing_pin: Arc<Mutex<Option<PairingState>>>,
    pub rate_limiter: RateLimitState,
}

pub fn run(config: Config) -> Result<(), Box<dyn std::error::Error>> {
    let rt = tokio::runtime::Runtime::new()?;
    let _guard = rt.enter();

    let db = Database::open(&config.db_path)?;
    let state = Arc::new(AppState {
        db: Arc::new(Mutex::new(db)),
        auth_token: config.auth_token.clone(),
        pairing_pin: Arc::new(Mutex::new(None)),
        rate_limiter: RateLimitState::new(),
    });

    let router = create_router(state.clone(), &config);

    let addr = config.listener.local_addr()?;

    println!("API server listening on http://{}", addr);

    rt.block_on(async {
        axum::serve(
            tokio::net::TcpListener::from_std(config.listener)?,
            router.into_make_service(),
        )
        .await
    })?;

    Ok(())
}