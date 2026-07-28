pub mod config;
pub mod models;
pub mod db;
pub mod api;

use config::Config;
use db::Database;
use api::create_router;

use std::sync::Arc;
use tokio::sync::Mutex;

pub struct AppState {
    pub db: Arc<Mutex<Database>>,
    pub auth_token: String,
}

pub fn run(config: Config) -> Result<(), Box<dyn std::error::Error>> {
    let rt = tokio::runtime::Runtime::new()?;
    let _guard = rt.enter();

    let db = Database::open(&config.db_path)?;
    let state = Arc::new(AppState {
        db: Arc::new(Mutex::new(db)),
        auth_token: config.auth_token.clone(),
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
