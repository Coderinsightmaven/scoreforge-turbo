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

    let icon = {
        let img = image::load_from_memory(include_bytes!("../assets/icon.png"))
            .expect("Failed to load app icon")
            .into_rgba8();
        let (w, h) = img.dimensions();
        egui::IconData {
            rgba: img.into_raw(),
            width: w,
            height: h,
        }
    };

    let native_options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([1280.0, 800.0])
            .with_min_inner_size([800.0, 600.0])
            .with_title("ScoreForge Display")
            .with_icon(std::sync::Arc::new(icon)),
        renderer: eframe::Renderer::Wgpu,
        ..Default::default()
    };

    eframe::run_native(
        "ScoreForge Display",
        native_options,
        Box::new(|cc| Ok(Box::new(ScoreForgeApp::new(cc)))),
    )
}
