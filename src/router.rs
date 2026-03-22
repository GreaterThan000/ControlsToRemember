use axum::{routing::get, Router, response::IntoResponse};

pub fn build_router() -> Router {
    Router::new()
        .route("/healthz", get(healthz))
        .route("/proxy", axum::routing::any(super::handler::proxy_handler))
}

async fn healthz() -> impl IntoResponse {
    (axum::http::StatusCode::OK, "ok")
}
