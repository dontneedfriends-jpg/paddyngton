use tauri::Manager;

mod commands;
mod models;
mod utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::window::minimize_window,
            commands::window::maximize_window,
            commands::window::close_window,
            commands::window::is_maximized,
            commands::window::set_always_on_top,
            commands::version::get_version,
            commands::version::get_system_fonts,
            commands::snapshot::save_version_snapshot,
            commands::snapshot::list_version_snapshots,
            commands::snapshot::restore_version_snapshot,
            commands::bear::open_bear,
            commands::bear::save_bear,
            commands::fs::create_test_book,
            commands::fs::delete_file,
            commands::fs::save_binary_file,
            commands::pdf::generate_pdf
        ])
        .setup(|app| {
            let args: Vec<String> = std::env::args().collect();
            let test_mode = args.iter().any(|a| a == "--test");
            if test_mode {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.eval("window.__TAURI_INTERNALS__ = window.__TAURI_INTERNALS__ || {}; window.__TAURI_INTERNALS__.testMode = true;");
                }
            }

            if cfg!(debug_assertions) {
                let _ = app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                );
            }

            let _ = app.handle().plugin(
                tauri_plugin_updater::Builder::default().build()
            );
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
