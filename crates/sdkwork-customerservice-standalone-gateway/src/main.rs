use sdkwork_customerservice_gateway_assembly::assemble_application_router;
use sdkwork_customerservice_service_host::CustomerServiceHost;
use std::sync::Arc;
use tower_http::cors::CorsLayer;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();
    tracing::info!("Starting SDKWork Customer Service API Server...");

    let host = Arc::new(CustomerServiceHost::new().await);
    let app = assemble_application_router(host)
        .await
        .router
        .layer(CorsLayer::permissive());

    let addr =
        std::env::var("CUSTOMER_SERVICE_API_BIND").unwrap_or_else(|_| "0.0.0.0:18091".to_owned());
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .expect("bind customerservice api server");
    tracing::info!("Customer Service API listening on http://{addr}");
    axum::serve(listener, app)
        .await
        .expect("customerservice api server failed");
}
