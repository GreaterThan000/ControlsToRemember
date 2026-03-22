use crate::errors::ProxyError;

/// Helpers for streaming request/response bodies between client and upstream.
pub async fn stream_body() -> Result<axum::body::Body, ProxyError> {
    // TODO: implement streaming conversion between reqwest streams and axum bodies
    Ok(axum::body::Body::empty())
}
