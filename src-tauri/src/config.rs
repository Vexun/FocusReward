use std::net::TcpListener;
use std::path::PathBuf;
use std::path::Path;

pub struct Config {
    pub listener: TcpListener,
    pub port: u16,
    pub db_path: PathBuf,
    pub frontend_path: PathBuf,
    pub auth_token: String,
    pub token_path: PathBuf,
}

const PORT_RANGE_START: u16 = 41000;
const PORT_RANGE_END: u16 = 41004;

fn find_free_port() -> Option<(TcpListener, u16)> {
    for port in PORT_RANGE_START..=PORT_RANGE_END {
        if let Ok(listener) = TcpListener::bind((std::net::Ipv4Addr::new(127, 0, 0, 1), port)) {
            let addr = listener.local_addr().ok()?;
            return Some((listener, addr.port()));
        }
    }
    None
}

pub fn load_config() -> Config {
    let (listener, port) = find_free_port().expect("no free port found in range 41000-41004");

    let data_dir = dirs_data_dir().unwrap_or_else(|| PathBuf::from("."));
    std::fs::create_dir_all(&data_dir).ok();

    let db_path = data_dir.join("focusreward.db");
    let token_path = data_dir.join("focusreward.token");
    let frontend_path = find_frontend_path();
    let auth_token = load_or_create_token(&token_path);

    Config {
        listener,
        port,
        db_path,
        frontend_path,
        auth_token,
        token_path,
    }
}

fn load_or_create_token(token_path: &Path) -> String {
    if let Ok(content) = std::fs::read_to_string(token_path) {
        let trimmed = content.trim().to_string();
        if !trimmed.is_empty() {
            return trimmed;
        }
    }
    let token = uuid::Uuid::new_v4().to_string();
    std::fs::write(token_path, &token).expect("failed to write token file");
    set_restrictive_permissions(token_path);
    token
}

#[cfg(unix)]
pub fn set_restrictive_permissions(path: &Path) {
    use std::os::unix::fs::PermissionsExt;
    if let Ok(metadata) = std::fs::metadata(path) {
        let mut perms = metadata.permissions();
        perms.set_mode(0o600);
        let _ = std::fs::set_permissions(path, perms);
    }
}

#[cfg(not(unix))]
pub fn set_restrictive_permissions(_path: &Path) {
    // Windows ACLs are not explicitly handled here.
    // In the typical single-user-desktop case, default file permissions
    // restrict access to the owning user. This is a known gap.
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
