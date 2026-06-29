use axum::http::{HeaderMap, StatusCode};
use axum::middleware::{from_fn, Next};
use axum::response::{IntoResponse, Response};
use std::env;

const INGRESS_TOKEN_ENV: &str = "SDKWORK_CUSTOMERSERVICE_INGRESS_TOKEN";

pub fn ingress_token_from_env() -> Option<String> {
    env::var(INGRESS_TOKEN_ENV)
        .ok()
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
}

fn extract_ingress_token(headers: &HeaderMap) -> Option<String> {
    if let Some(value) = headers
        .get("x-api-key")
        .and_then(|header| header.to_str().ok())
    {
        return Some(value.to_owned());
    }
    if let Some(value) = headers
        .get("authorization")
        .and_then(|header| header.to_str().ok())
    {
        let trimmed = value.trim();
        if let Some(token) = trimmed.strip_prefix("Bearer ") {
            return Some(token.trim().to_owned());
        }
    }
    None
}

pub async fn require_ingress_token(
    headers: HeaderMap,
    request: axum::extract::Request,
    next: Next,
) -> Response {
    let Some(expected) = ingress_token_from_env() else {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            "ingress token is not configured",
        )
            .into_response();
    };
    let Some(provided) = extract_ingress_token(&headers) else {
        return (StatusCode::UNAUTHORIZED, "missing ingress token").into_response();
    };
    if provided != expected {
        return (StatusCode::UNAUTHORIZED, "invalid ingress token").into_response();
    }
    next.run(request).await
}

pub fn with_ingress_auth(router: axum::Router) -> axum::Router {
    router.layer(from_fn(require_ingress_token))
}
