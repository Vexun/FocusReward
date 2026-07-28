#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use focusreward_lib::config::load_config;
use focusreward_lib::run;
use std::path::PathBuf;

struct TokenPath(PathBuf);

#[tauri::command]
fn get_auth_token(token_path: tauri::State<'_, TokenPath>) -> Result<String, String> {
    std::fs::read_to_string(&token_path.0)
        .map(|s| s.trim().to_string())
        .map_err(|e| format!("failed to read token: {}", e))
}

fn main() {
    let config = load_config();
    let port = config.port;
    let token_path = config.token_path.clone();

    std::thread::spawn(move || {
        if let Err(e) = run(config) {
            eprintln!("API server error: {}", e);
        }
    });

    std::thread::sleep(std::time::Duration::from_millis(200));

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(TokenPath(token_path))
        .invoke_handler(tauri::generate_handler![get_auth_token])
        .setup(move |app| {
            let url = format!("http://127.0.0.1:{}", port);

            let _window = tauri::WebviewWindowBuilder::new(
                app,
                "main",
                tauri::WebviewUrl::External(url.parse().unwrap()),
            )
            .title("FocusReward")
            .inner_size(1024.0, 768.0)
            .resizable(true)
            .build()?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}