pub mod background;
pub mod image;
pub mod tennis_name;
pub mod tennis_score;
pub mod tennis_serving;
pub mod text;

use std::path::Path;

use egui::{Color32, Pos2, Rect, Vec2};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::data::live_data::TennisLiveData;

// --- Serde wrappers for egui types ---

mod serde_color32 {
    use egui::Color32;
    use serde::{Deserialize, Deserializer, Serialize, Serializer};

    #[derive(Serialize, Deserialize)]
    struct Color32Serde(u8, u8, u8, u8);

    pub fn serialize<S: Serializer>(color: &Color32, s: S) -> Result<S::Ok, S::Error> {
        Color32Serde(color.r(), color.g(), color.b(), color.a()).serialize(s)
    }

    pub fn deserialize<'de, D: Deserializer<'de>>(d: D) -> Result<Color32, D::Error> {
        let Color32Serde(r, g, b, a) = Color32Serde::deserialize(d)?;
        Ok(Color32::from_rgba_unmultiplied(r, g, b, a))
    }
}

mod serde_color32_option {
    use egui::Color32;
    use serde::{Deserialize, Deserializer, Serialize, Serializer};

    #[derive(Serialize, Deserialize)]
    struct Color32Serde(u8, u8, u8, u8);

    pub fn serialize<S: Serializer>(color: &Option<Color32>, s: S) -> Result<S::Ok, S::Error> {
        match color {
            Some(c) => Some(Color32Serde(c.r(), c.g(), c.b(), c.a())).serialize(s),
            None => None::<Color32Serde>.serialize(s),
        }
    }

    pub fn deserialize<'de, D: Deserializer<'de>>(d: D) -> Result<Option<Color32>, D::Error> {
        let opt = Option::<Color32Serde>::deserialize(d)?;
        Ok(opt.map(|Color32Serde(r, g, b, a)| Color32::from_rgba_unmultiplied(r, g, b, a)))
    }
}

mod serde_vec2 {
    use egui::Vec2;
    use serde::{Deserialize, Deserializer, Serialize, Serializer};

    #[derive(Serialize, Deserialize)]
    struct Vec2Serde(f32, f32);

    pub fn serialize<S: Serializer>(v: &Vec2, s: S) -> Result<S::Ok, S::Error> {
        Vec2Serde(v.x, v.y).serialize(s)
    }

    pub fn deserialize<'de, D: Deserializer<'de>>(d: D) -> Result<Vec2, D::Error> {
        let Vec2Serde(x, y) = Vec2Serde::deserialize(d)?;
        Ok(Vec2::new(x, y))
    }
}

// --- Component Types ---

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ComponentType {
    Text,
    Image,
    Background,
    TennisGameScore,
    TennisSetScore,
    TennisMatchScore,
    TennisPlayerName,
    TennisDoublesName,
    TennisServingIndicator,
}

impl ComponentType {
    pub fn label(&self) -> &'static str {
        match self {
            Self::Text => "Text",
            Self::Image => "Image",
            Self::Background => "Background",
            Self::TennisGameScore => "Game Score",
            Self::TennisSetScore => "Set Score",
            Self::TennisMatchScore => "Match Score",
            Self::TennisPlayerName => "Player Name",
            Self::TennisDoublesName => "Doubles Name",
            Self::TennisServingIndicator => "Serving Indicator",
        }
    }
}

// --- Component Style ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentStyle {
    pub font_size: f32,
    #[serde(with = "serde_color32")]
    pub font_color: Color32,
    #[serde(with = "serde_color32_option")]
    pub background_color: Option<Color32>,
    #[serde(with = "serde_color32_option")]
    pub border_color: Option<Color32>,
    pub border_width: f32,
    pub horizontal_align: HorizontalAlign,
    #[serde(default)]
    pub auto_fit_text: bool,
}

impl Default for ComponentStyle {
    fn default() -> Self {
        Self {
            font_size: 24.0,
            font_color: Color32::WHITE,
            background_color: None,
            border_color: None,
            border_width: 0.0,
            horizontal_align: HorizontalAlign::Center,
            auto_fit_text: false,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum HorizontalAlign {
    Left,
    Center,
    Right,
}

// --- Component Data ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ComponentData {
    Text {
        content: String,
    },
    Image {
        asset_id: Option<Uuid>,
    },
    Background {
        asset_id: Option<Uuid>,
        #[serde(with = "serde_color32")]
        color: Color32,
    },
    TennisScore {
        player_number: u8,
        #[serde(default)]
        set_number: u8,
    },
    TennisName {
        player_number: u8,
    },
    TennisDoubles {
        player_number: u8,
    },
    TennisServing {
        player_number: u8,
        #[serde(with = "serde_color32")]
        indicator_color: Color32,
        indicator_size: f32,
    },
}

// --- Scoreboard Component ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoreboardComponent {
    pub id: Uuid,
    pub component_type: ComponentType,
    #[serde(with = "serde_vec2")]
    pub position: Vec2,
    #[serde(with = "serde_vec2")]
    pub size: Vec2,
    pub z_index: i32,
    pub visible: bool,
    pub locked: bool,
    pub style: ComponentStyle,
    pub data: ComponentData,
}

impl ScoreboardComponent {
    pub fn new(component_type: ComponentType, position: Vec2, size: Vec2) -> Self {
        let data = match component_type {
            ComponentType::Text => ComponentData::Text {
                content: "Text".to_string(),
            },
            ComponentType::Image => ComponentData::Image { asset_id: None },
            ComponentType::Background => ComponentData::Background {
                asset_id: None,
                color: Color32::from_rgb(0, 100, 0),
            },
            ComponentType::TennisGameScore
            | ComponentType::TennisSetScore
            | ComponentType::TennisMatchScore => ComponentData::TennisScore {
                player_number: 1,
                set_number: 0,
            },
            ComponentType::TennisPlayerName => ComponentData::TennisName { player_number: 1 },
            ComponentType::TennisDoublesName => ComponentData::TennisDoubles { player_number: 1 },
            ComponentType::TennisServingIndicator => ComponentData::TennisServing {
                player_number: 1,
                indicator_color: Color32::GREEN,
                indicator_size: 12.0,
            },
        };

        Self {
            id: Uuid::new_v4(),
            component_type,
            position,
            size,
            z_index: 0,
            visible: true,
            locked: false,
            style: ComponentStyle::default(),
            data,
        }
    }

    pub fn rect(&self) -> Rect {
        Rect::from_min_size(Pos2::new(self.position.x, self.position.y), self.size)
    }
}

// --- Render Context ---

#[derive(Debug, Clone)]
pub enum RenderContext {
    Designer { is_selected: bool },
    Display,
}

// --- Rendering ---

pub fn render_component(
    component: &ScoreboardComponent,
    painter: &egui::Painter,
    ctx: &RenderContext,
    live_data: Option<&TennisLiveData>,
    texture_cache: &TextureCache,
    zoom: f32,
    pan: Vec2,
) {
    let screen_pos = canvas_to_screen(component.position, zoom, pan);
    let screen_size = component.size * zoom;
    let rect = Rect::from_min_size(Pos2::new(screen_pos.x, screen_pos.y), screen_size);

    // Draw background if set
    if let Some(bg) = component.style.background_color {
        painter.rect_filled(rect, 0.0, bg);
    }

    // Draw border if set
    if let Some(border_color) = component.style.border_color
        && component.style.border_width > 0.0
    {
        painter.rect_stroke(
            rect,
            0.0,
            egui::Stroke::new(component.style.border_width * zoom, border_color),
            egui::epaint::StrokeKind::Outside,
        );
    }

    // Type-specific rendering
    match &component.data {
        ComponentData::Text { content } => {
            text::render_text(painter, rect, content, &component.style, zoom);
        }
        ComponentData::Image { asset_id } => {
            self::image::render_image(painter, rect, asset_id, texture_cache);
        }
        ComponentData::Background { asset_id, color } => {
            background::render_background(painter, rect, asset_id, *color, texture_cache);
        }
        ComponentData::TennisScore { player_number, set_number } => {
            tennis_score::render_tennis_score(
                painter,
                rect,
                &component.component_type,
                *player_number,
                *set_number,
                &component.style,
                live_data,
                zoom,
            );
        }
        ComponentData::TennisName { player_number } => {
            tennis_name::render_tennis_name(
                painter,
                rect,
                *player_number,
                false,
                &component.style,
                live_data,
                zoom,
            );
        }
        ComponentData::TennisDoubles { player_number } => {
            tennis_name::render_tennis_name(
                painter,
                rect,
                *player_number,
                true,
                &component.style,
                live_data,
                zoom,
            );
        }
        ComponentData::TennisServing {
            player_number,
            indicator_color,
            indicator_size,
        } => {
            tennis_serving::render_serving_indicator(
                painter,
                rect,
                *player_number,
                *indicator_color,
                *indicator_size * zoom,
                live_data,
            );
        }
    }

    // Selection outline in designer mode
    if let RenderContext::Designer { is_selected: true } = ctx {
        painter.rect_stroke(
            rect,
            0.0,
            egui::Stroke::new(2.0, Color32::from_rgb(59, 130, 246)),
            egui::epaint::StrokeKind::Outside,
        );
    }
}

pub fn canvas_to_screen(canvas_pos: Vec2, zoom: f32, pan: Vec2) -> Vec2 {
    canvas_pos * zoom + pan
}

pub fn screen_to_canvas(screen_pos: Vec2, zoom: f32, pan: Vec2) -> Vec2 {
    (screen_pos - pan) / zoom
}

// --- Texture Loading ---

pub fn load_texture_from_path(
    ctx: &egui::Context,
    id: Uuid,
    path: &Path,
) -> Result<egui::TextureHandle, String> {
    let img = ::image::open(path).map_err(|e| format!("Failed to open image: {e}"))?;
    let rgba = img.into_rgba8();
    let size = [rgba.width() as usize, rgba.height() as usize];
    let pixels = rgba.into_raw();
    let color_image = egui::ColorImage::from_rgba_unmultiplied(size, &pixels);
    let name = format!("asset-{id}");
    Ok(ctx.load_texture(name, color_image, egui::TextureOptions::LINEAR))
}

// --- Texture Cache ---

pub struct TextureCache {
    textures: std::collections::HashMap<Uuid, egui::TextureHandle>,
}

impl TextureCache {
    pub fn new() -> Self {
        Self {
            textures: std::collections::HashMap::new(),
        }
    }

    pub fn get(&self, id: &Uuid) -> Option<&egui::TextureHandle> {
        self.textures.get(id)
    }

    pub fn insert(&mut self, id: Uuid, handle: egui::TextureHandle) {
        self.textures.insert(id, handle);
    }

    pub fn remove(&mut self, id: &Uuid) {
        self.textures.remove(id);
    }

    pub fn contains(&self, id: &Uuid) -> bool {
        self.textures.contains_key(id)
    }

    /// Load a texture if not already cached. Returns true if the texture is available.
    pub fn ensure_loaded(
        &mut self,
        ctx: &egui::Context,
        asset_id: Uuid,
        asset_path: &Path,
    ) -> bool {
        if self.contains(&asset_id) {
            return true;
        }
        match load_texture_from_path(ctx, asset_id, asset_path) {
            Ok(handle) => {
                self.insert(asset_id, handle);
                true
            }
            Err(e) => {
                tracing::warn!("Failed to load texture for asset {asset_id}: {e}");
                false
            }
        }
    }

    /// Copy texture handles from another cache, removing stale entries not in source.
    pub fn sync_from(&mut self, other: &TextureCache) {
        // Add/update entries from source
        for (id, handle) in &other.textures {
            if !self.textures.contains_key(id) {
                self.textures.insert(*id, handle.clone());
            }
        }
        // Remove entries not in source
        self.textures.retain(|id, _| other.textures.contains_key(id));
    }
}
