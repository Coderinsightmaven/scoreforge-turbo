use egui::Rect;

use super::ComponentStyle;
use crate::data::live_data::TennisLiveData;

/// Format elapsed milliseconds as H:MM (e.g. "1:05")
fn format_elapsed(elapsed_ms: u64) -> String {
    let total_minutes = elapsed_ms / 60_000;
    let hours = total_minutes / 60;
    let minutes = total_minutes % 60;
    format!("{}:{:02}", hours, minutes)
}

pub fn render_tennis_time(
    painter: &egui::Painter,
    rect: Rect,
    style: &ComponentStyle,
    live_data: Option<&TennisLiveData>,
    zoom: f32,
) {
    let text = if let Some(data) = live_data {
        if let Some(start_ts) = data.match_started_timestamp {
            let end_ts = if data.is_match_complete {
                data.match_completed_at.unwrap_or_else(|| {
                    std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_millis() as u64
                })
            } else {
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis() as u64
            };

            if end_ts > start_ts {
                format_elapsed(end_ts - start_ts)
            } else {
                "0:00".to_string()
            }
        } else {
            "0:00".to_string()
        }
    } else {
        // Designer preview
        "0:12".to_string()
    };

    super::text::render_aligned_text(painter, rect, &text, style, zoom);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn format_elapsed_zero() {
        assert_eq!(format_elapsed(0), "0:00");
    }

    #[test]
    fn format_elapsed_seconds() {
        assert_eq!(format_elapsed(45_000), "0:00");
    }

    #[test]
    fn format_elapsed_minutes() {
        assert_eq!(format_elapsed(123_000), "0:02");
    }

    #[test]
    fn format_elapsed_hours() {
        assert_eq!(format_elapsed(3_661_000), "1:01");
    }
}
