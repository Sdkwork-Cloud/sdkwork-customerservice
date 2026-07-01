use axum::http::{HeaderMap, StatusCode};
use axum::middleware::{from_fn, Next};
use axum::response::{IntoResponse, Response};
use sdkwork_utils_rust::secure_compare;
use sdkwork_utils_rust::{SdkWorkProblemDetail, SdkWorkResultCode};
use sdkwork_web_core::new_request_id;
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

fn ingress_problem(status_code: SdkWorkResultCode, detail: impl Into<String>) -> Response {
    let trace_id = new_request_id();
    let problem = SdkWorkProblemDetail::platform(status_code, detail, trace_id);
    let status = StatusCode::from_u16(problem.status).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
    (
        status,
        [(axum::http::header::CONTENT_TYPE, "application/problem+json")],
        axum::Json(problem),
    )
        .into_response()
}

pub async fn require_ingress_token(
    headers: HeaderMap,
    request: axum::extract::Request,
    next: Next,
) -> Response {
    let Some(expected) = ingress_token_from_env() else {
        return ingress_problem(
            SdkWorkResultCode::ServiceUnavailable,
            "ingress token is not configured",
        );
    };
    let Some(provided) = extract_ingress_token(&headers) else {
        return ingress_problem(
            SdkWorkResultCode::AuthenticationRequired,
            "missing ingress token",
        );
    };
    if !secure_compare(&provided, &expected) {
        return ingress_problem(SdkWorkResultCode::InvalidToken, "invalid ingress token");
    }
    next.run(request).await
}

pub fn with_ingress_auth(router: axum::Router) -> axum::Router {
    router.layer(from_fn(require_ingress_token))
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use axum::routing::get;
    use axum::Router;
    use tower::ServiceExt;

    async fn probe(token_header: Option<(&'static str, &'static str)>) -> StatusCode {
        let app = with_ingress_auth(Router::new().route("/ok", get(|| async { "ok" })));
        let mut builder = Request::builder().uri("/ok");
        if let Some((name, value)) = token_header {
            builder = builder.header(name, value);
        }
        app.oneshot(builder.body(Body::empty()).expect("request"))
            .await
            .expect("response")
            .status()
    }

    #[tokio::test]
    async fn ingress_auth_contract() {
        std::env::set_var(INGRESS_TOKEN_ENV, "test-ingress-token");
        assert_eq!(probe(None).await, StatusCode::UNAUTHORIZED, "missing token");
        assert_eq!(
            probe(Some(("authorization", "Bearer test-ingress-token"))).await,
            StatusCode::OK,
            "valid bearer token"
        );
        std::env::remove_var(INGRESS_TOKEN_ENV);
        assert_eq!(
            probe(None).await,
            StatusCode::SERVICE_UNAVAILABLE,
            "unconfigured ingress token"
        );
    }
}
