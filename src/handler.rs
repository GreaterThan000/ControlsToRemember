use axum::{response::IntoResponse, http::StatusCode};

pub async fn proxy_handler() -> impl IntoResponse {
    // TODO: extract request and forward to proxy::forward_request
    (StatusCode::NOT_IMPLEMENTED, "proxy handler not implemented")
}
