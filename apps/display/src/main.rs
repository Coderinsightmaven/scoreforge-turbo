mod app;
mod components;
mod data;
mod designer;
mod display;
mod state;
mod storage;

use app::ScoreForgeApp;

fn main() -> eframe::Result {
    tracing_subscriber::fmt::init();

    let native_options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([1280.0, 800.0])
            .with_min_inner_size([800.0, 600.0])
            .with_title("ScoreForge Display"),
        ..Default::default()
    };

    eframe::run_native(
        "ScoreForge Display",
        native_options,
        Box::new(|cc| Ok(Box::new(ScoreForgeApp::new(cc)))),
    )
}
