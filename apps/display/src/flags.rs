use std::collections::HashMap;

use egui::{ColorImage, TextureHandle, TextureOptions};

/// Embed a flag PNG at compile time, returning (country_code, bytes).
macro_rules! include_flag {
    ($code:expr) => {
        ($code, include_bytes!(concat!("../flags/", $code, ".png")).as_slice())
    };
}

/// Returns all embedded flag PNGs as (country_code, png_bytes) pairs.
fn embedded_flags() -> Vec<(&'static str, &'static [u8])> {
    vec![
        include_flag!("ar"),
        include_flag!("at"),
        include_flag!("au"),
        include_flag!("be"),
        include_flag!("bg"),
        include_flag!("br"),
        include_flag!("ca"),
        include_flag!("ch"),
        include_flag!("cl"),
        include_flag!("cn"),
        include_flag!("co"),
        include_flag!("cz"),
        include_flag!("de"),
        include_flag!("dk"),
        include_flag!("es"),
        include_flag!("fi"),
        include_flag!("fr"),
        include_flag!("gb"),
        include_flag!("ge"),
        include_flag!("gr"),
        include_flag!("hr"),
        include_flag!("in"),
        include_flag!("it"),
        include_flag!("jp"),
        include_flag!("kr"),
        include_flag!("kz"),
        include_flag!("nl"),
        include_flag!("no"),
        include_flag!("pl"),
        include_flag!("pt"),
        include_flag!("ro"),
        include_flag!("rs"),
        include_flag!("ru"),
        include_flag!("se"),
        include_flag!("th"),
        include_flag!("tn"),
        include_flag!("tw"),
        include_flag!("ua"),
        include_flag!("us"),
        include_flag!("za"),
    ]
}

/// Cache of flag textures keyed by lowercase ISO 3166-1 alpha-2 country code.
pub struct FlagCache {
    textures: HashMap<String, TextureHandle>,
    loaded: bool,
}

impl FlagCache {
    pub fn new() -> Self {
        Self {
            textures: HashMap::new(),
            loaded: false,
        }
    }

    /// Load all embedded flags into egui textures. Call once when the egui context is available.
    /// Subsequent calls are no-ops.
    pub fn ensure_loaded(&mut self, ctx: &egui::Context) {
        if self.loaded {
            return;
        }
        for (code, png_data) in embedded_flags() {
            if let Ok(img) = image::load_from_memory(png_data) {
                let rgba = img.into_rgba8();
                let size = [rgba.width() as usize, rgba.height() as usize];
                let color_image = ColorImage::from_rgba_unmultiplied(size, &rgba);
                let handle = ctx.load_texture(
                    format!("flag-{code}"),
                    color_image,
                    TextureOptions::LINEAR,
                );
                self.textures.insert(code.to_string(), handle);
            }
        }
        self.loaded = true;
    }

    /// Get a flag texture by lowercase ISO 3166-1 alpha-2 country code.
    pub fn get(&self, country_code: &str) -> Option<&TextureHandle> {
        self.textures.get(country_code)
    }

    /// Returns true if flags have been loaded into textures.
    pub fn is_loaded(&self) -> bool {
        self.loaded
    }

    /// Returns the number of loaded flag textures.
    pub fn len(&self) -> usize {
        self.textures.len()
    }

    /// Returns true if the cache has no loaded textures.
    pub fn is_empty(&self) -> bool {
        self.textures.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn embedded_flags_returns_all_40() {
        let flags = embedded_flags();
        assert_eq!(flags.len(), 40, "Expected 40 embedded flags");
    }

    #[test]
    fn embedded_flags_have_non_empty_data() {
        for (code, data) in embedded_flags() {
            assert!(!data.is_empty(), "Flag data for {code} should not be empty");
        }
    }

    #[test]
    fn embedded_flags_are_valid_png() {
        for (code, data) in embedded_flags() {
            // PNG magic bytes: 0x89 0x50 0x4E 0x47
            assert!(
                data.len() >= 4 && data[0] == 0x89 && data[1] == 0x50 && data[2] == 0x4E && data[3] == 0x47,
                "Flag {code} does not have valid PNG header"
            );
        }
    }

    #[test]
    fn flag_cache_new_is_empty() {
        let cache = FlagCache::new();
        assert!(!cache.is_loaded());
        assert!(cache.is_empty());
        assert_eq!(cache.len(), 0);
        assert!(cache.get("us").is_none());
    }

    #[test]
    fn no_duplicate_country_codes() {
        let flags = embedded_flags();
        let mut codes = std::collections::HashSet::new();
        for (code, _) in &flags {
            assert!(codes.insert(*code), "Duplicate country code: {code}");
        }
    }
}
