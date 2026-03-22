use reqwest::Client;

/// Create or configure a reqwest::Client for upstream calls.
pub fn create_client() -> Client {
    // TODO: configure timeouts, TLS, connection pooling
    Client::new()
}
