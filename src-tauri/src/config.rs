use std::path::PathBuf;

pub struct Config {
    pub port: u16,
    pub db_path: PathBuf,
    pub frontend_path: PathBuf,
}

const PORT_RANGE_START: u16 = 41000;
const PORT_RANGE_END: u16 = 41004;

fn find_free_port() -> Option<u16> {
    for port in PORT_RANGE_START..=PORT_RANGE_END {
        if let Ok(listener) = std::net::TcpListener::bind((std::net::Ipv4Addr::new(127, 0, 0, 1), port)) {
            let _ = listener;
            return Some(port);
        }
    }
    None
}

pub fn load_config() -> Config {
    let port = find_free_port().expect("no free port found in range 41000-41004");

    let db_path = dirs_or_default();

    let frontend_path = find_frontend_path();

    Config {
        port,
        db_path,
        frontend_path,
    }
}

fn dirs_or_default() -> PathBuf {
    let data_dir = dirs_data_dir().unwrap_or_else(|| PathBuf::from("."));
    std::fs::create_dir_all(&data_dir).ok();
    data_dir.join("focusreward.db")
}

fn dirs_data_dir() -> Option<PathBuf> {
    if let Ok(dir) = std::env::var("FOCUSREWARD_DATA_DIR") {
        return Some(PathBuf::from(dir));
    }
    std::env::current_dir().ok()
}

fn find_frontend_path() -> PathBuf {
    if let Ok(dir) = std::env::var("FOCUSREWARD_FRONTEND_DIR") {
        return PathBuf::from(dir);
    }

    let candidates = vec![
        PathBuf::from("../frontend/out"),
        PathBuf::from("frontend/out"),
        PathBuf::from("/usr/share/focusreward/frontend"),
    ];

    for p in &candidates {
        if p.join("index.html").exists() {
            return p.clone();
        }
    }

    candidates[0].clone()
}
