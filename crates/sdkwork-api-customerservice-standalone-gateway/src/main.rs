use sdkwork_api_customerservice_assembly::assemble_api_router;
use sdkwork_customerservice_service_host::CustomerServiceHost;
use std::sync::Arc;

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
    let environment = sdkwork_web_bootstrap::web_environment_from_env(&[
        "SDKWORK_CUSTOMER_SERVICE_ENVIRONMENT",
    ]);
    let policy = sdkwork_web_bootstrap::security_policy_for_environment(
        &environment,
        std::iter::empty(),
    );
    let app = assemble_api_router(host)
        .await
        .router
        .layer(sdkwork_web_axum::cors_layer_from_policy(policy.cors));

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
