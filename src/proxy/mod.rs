pub mod client;
pub mod headers;
pub mod stream;
pub mod cache;

use crate::errors::ProxyError;

pub async fn forward_request() -> Result<axum::response::Response, ProxyError> {
    // TODO: orchestrate validation, headers, streaming, caching, etc.
    Err(ProxyError::NotImplemented)
}
