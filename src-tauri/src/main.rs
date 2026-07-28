#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use focusreward_lib::config::load_config;
use focusreward_lib::run;

fn main() {
    let config = load_config();
    let port = config.port;

    std::thread::spawn(move || {
        if let Err(e) = run(config) {
            eprintln!("API server error: {}", e);
        }
    });

    std::thread::sleep(std::time::Duration::from_millis(200));

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
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
