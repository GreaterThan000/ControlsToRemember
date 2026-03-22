use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct Config {
    /// Listen address, e.g. "127.0.0.1:3000"
    pub listen: String,
    // TODO: add allowed_hosts, timeouts, header rules, etc.
}

impl Default for Config {
    fn default() -> Self {
        Config {
            listen: "127.0.0.1:3000".to_string(),
        }
    }
}

pub fn load_config() -> Result<Config, Box<dyn std::error::Error + Send + Sync>> {
    // TODO: implement layered config loading (files + env)
    Ok(Config::default())
}
