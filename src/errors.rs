use axum::response::{IntoResponse, Response};
use axum::http::StatusCode;
use std::fmt;

#[derive(Debug)]
pub enum ProxyError {
    NotImplemented,
    ConfigError(String),
    Internal(String),
    BadRequest(String),
    Forbidden(String),
}

impl fmt::Display for ProxyError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ProxyError::NotImplemented => write!(f, "not implemented"),
            ProxyError::ConfigError(s) => write!(f, "config error: {}", s),
            ProxyError::Internal(s) => write!(f, "internal error: {}", s),
            ProxyError::BadRequest(s) => write!(f, "bad request: {}", s),
            ProxyError::Forbidden(s) => write!(f, "forbidden: {}", s),
        }
    }
}

impl std::error::Error for ProxyError {}

impl IntoResponse for ProxyError {
    fn into_response(self) -> Response {
        let (status, body) = match self {
            ProxyError::NotImplemented => (StatusCode::NOT_IMPLEMENTED, "not implemented".to_string()),
            ProxyError::ConfigError(s) => (StatusCode::INTERNAL_SERVER_ERROR, s),
            ProxyError::Internal(s) => (StatusCode::INTERNAL_SERVER_ERROR, s),
            ProxyError::BadRequest(s) => (StatusCode::BAD_REQUEST, s),
            ProxyError::Forbidden(s) => (StatusCode::FORBIDDEN, s),
        };
        (status, body).into_response()
    }
}
