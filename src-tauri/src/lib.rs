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
}

pub fn run(config: Config) -> Result<(), Box<dyn std::error::Error>> {
    let rt = tokio::runtime::Runtime::new()?;
    let _guard = rt.enter();

    let db = Database::open(&config.db_path)?;
    let state = Arc::new(AppState {
        db: Arc::new(Mutex::new(db)),
    });

    let router = create_router(state.clone(), &config);

    let listener = std::net::TcpListener::bind((std::net::Ipv4Addr::new(127, 0, 0, 1), config.port))?;
    let addr = listener.local_addr()?;

    println!("API server listening on http://{}", addr);

    rt.block_on(async {
        axum::serve(
            tokio::net::TcpListener::from_std(listener)?,
            router.into_make_service(),
        )
        .await
    })?;

    Ok(())
}
