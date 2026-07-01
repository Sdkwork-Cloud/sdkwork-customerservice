use sdkwork_customerservice_gateway_assembly::assemble_application_router;
use sdkwork_customerservice_service_host::CustomerServiceHost;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();
    tracing::info!(service = "customerservice-server", "starting api server");

    let host = Arc::new(CustomerServiceHost::new().await);
    let mut app = assemble_application_router(host).await.router;

    if std::env::var("CUSTOMER_SERVICE_CORS_ALLOW_ALL")
        .ok()
        .is_some_and(|value| value == "true" || value == "1")
    {
        tracing::warn!(
            "CUSTOMER_SERVICE_CORS_ALLOW_ALL is enabled; do not use this setting in production"
        );
        app = app.layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        );
    }

    let addr =
        std::env::var("CUSTOMER_SERVICE_API_BIND").unwrap_or_else(|_| "0.0.0.0:18091".to_owned());
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .expect("bind customerservice api server");
    tracing::info!(service = "customerservice-server", %addr, "listening");
    axum::serve(listener, app)
        .await
        .expect("customerservice api server failed");
}
