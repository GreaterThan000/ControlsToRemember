use std::net::SocketAddr;
use tracing_subscriber::EnvFilter;

mod lib {
    pub use crate::{config, router};
}

#[tokio::main]
async fn main() {
    // Initialize tracing/logging
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    // Load configuration (stub)
    let cfg = match lib::config::load_config() {
        Ok(c) => c,
        Err(e) => {
            tracing::error!(%e, "failed to load config");
            std::process::exit(1);
        }
    };

    let addr: SocketAddr = cfg.listen.parse().unwrap_or_else(|_| {
        "127.0.0.1:3000".parse().expect("valid default addr")
    });

    let app = lib::router::build_router();

    tracing::info!(%addr, "starting server");
    if let Err(e) = axum::Server::bind(&addr).serve(app.into_make_service()).await {
        tracing::error!(%e, "server error");
    }
}
