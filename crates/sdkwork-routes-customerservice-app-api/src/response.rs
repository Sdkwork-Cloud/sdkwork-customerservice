use axum::http::{header, HeaderName, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::Json;
use sdkwork_communication_customerservice_service::CustomerServiceError;
use sdkwork_utils_rust::{
    PageInfo, PageMode, SdkWorkApiResponse, SdkWorkPageData, SdkWorkProblemDetail,
    SdkWorkResourceData, SdkWorkResultCode, SDKWORK_TRACE_ID_HEADER,
};
use sdkwork_web_core::{new_request_id, WebRequestContext};
use serde::Serialize;

pub fn resolved_trace_id(web_context: Option<&WebRequestContext>) -> String {
    web_context
        .map(WebRequestContext::resolved_trace_id)
        .unwrap_or_else(new_request_id)
}

fn attach_trace_header(response: &mut Response, trace_id: &str) {
    let Ok(header_name) = HeaderName::try_from(SDKWORK_TRACE_ID_HEADER) else {
        return;
    };
    if let Ok(value) = HeaderValue::from_str(trace_id) {
        response.headers_mut().insert(header_name, value);
    }
}

fn success_json<T: Serialize>(
    status: StatusCode,
    data: T,
    web_context: Option<&WebRequestContext>,
) -> Response {
    let trace_id = resolved_trace_id(web_context);
    let envelope = SdkWorkApiResponse::success(data, trace_id.clone());
    let mut response = (status, Json(envelope)).into_response();
    attach_trace_header(&mut response, &trace_id);
    response
}

fn problem(
    status_code: SdkWorkResultCode,
    detail: impl Into<String>,
    web_context: Option<&WebRequestContext>,
) -> Response {
    let trace_id = resolved_trace_id(web_context);
    let problem = SdkWorkProblemDetail::platform(status_code, detail, trace_id.clone());
    let status = StatusCode::from_u16(problem.status).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
    let mut response = (status, Json(problem)).into_response();
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("application/problem+json"),
    );
    attach_trace_header(&mut response, &trace_id);
    response
}

pub fn ok_page<T: Serialize>(
    items: Vec<T>,
    page: u32,
    page_size: u32,
    total: u64,
    web_context: Option<&WebRequestContext>,
) -> Response {
    success_json(
        StatusCode::OK,
        SdkWorkPageData {
            items,
            page_info: PageInfo {
                mode: PageMode::Offset,
                page: Some(page.saturating_add(1) as i32),
                page_size: Some(page_size as i32),
                total_items: Some(total.to_string()),
                total_pages: None,
                next_cursor: None,
                has_more: None,
            },
        },
        web_context,
    )
}

pub fn ok_items<T: Serialize>(items: Vec<T>, web_context: Option<&WebRequestContext>) -> Response {
    let total = items.len() as u64;
    ok_page(items, 0, total.max(1) as u32, total, web_context)
}

pub fn ok_resource<T: Serialize>(item: T, web_context: Option<&WebRequestContext>) -> Response {
    success_json(StatusCode::OK, SdkWorkResourceData { item }, web_context)
}

pub fn created_resource<T: Serialize>(
    item: T,
    web_context: Option<&WebRequestContext>,
) -> Response {
    success_json(
        StatusCode::CREATED,
        SdkWorkResourceData { item },
        web_context,
    )
}

pub fn service_error(
    error: CustomerServiceError,
    web_context: Option<&WebRequestContext>,
) -> Response {
    match error {
        CustomerServiceError::Validation(message) => {
            problem(SdkWorkResultCode::ValidationError, message, web_context)
        }
        CustomerServiceError::NotFound(message) => {
            problem(SdkWorkResultCode::NotFound, message, web_context)
        }
        CustomerServiceError::Forbidden(message) => {
            problem(SdkWorkResultCode::PermissionRequired, message, web_context)
        }
        CustomerServiceError::Persistence(message) => {
            problem(SdkWorkResultCode::InternalError, message, web_context)
        }
    }
}

pub fn bad_request(message: &str, web_context: Option<&WebRequestContext>) -> Response {
    problem(
        SdkWorkResultCode::ValidationError,
        message.to_owned(),
        web_context,
    )
}

pub fn unauthorized(message: &str, web_context: Option<&WebRequestContext>) -> Response {
    problem(
        SdkWorkResultCode::AuthenticationRequired,
        message.to_owned(),
        web_context,
    )
}

pub fn subject_auth_error(
    error: crate::subject::SubjectAuthError,
    web_context: Option<&WebRequestContext>,
) -> Response {
    match error {
        crate::subject::SubjectAuthError::AuthenticationRequired => {
            unauthorized("authenticated runtime context is required", web_context)
        }
        crate::subject::SubjectAuthError::InvalidContext(message) => {
            bad_request(&message, web_context)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::to_bytes;
    use axum::http::StatusCode;
    use serde_json::Value;

    async fn response_json(response: Response) -> Value {
        let body = to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("response body");
        serde_json::from_slice(&body).expect("json body")
    }

    #[tokio::test]
    async fn unauthorized_returns_problem_detail_with_trace_id() {
        let response = unauthorized("authenticated runtime context is required", None);
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
        assert_eq!(
            response
                .headers()
                .get(header::CONTENT_TYPE)
                .and_then(|value| value.to_str().ok()),
            Some("application/problem+json")
        );
        let json = response_json(response).await;
        assert_eq!(json["code"], 40101);
        assert!(json["traceId"]
            .as_str()
            .is_some_and(|value| !value.is_empty()));
    }

    #[tokio::test]
    async fn success_resource_envelope_uses_code_zero_and_item_payload() {
        let response = ok_resource(serde_json::json!({ "id": "ticket-1" }), None);
        assert_eq!(response.status(), StatusCode::OK);
        let json = response_json(response).await;
        assert_eq!(json["code"], 0);
        assert_eq!(json["data"]["item"]["id"], "ticket-1");
        assert!(json["traceId"]
            .as_str()
            .is_some_and(|value| !value.is_empty()));
    }

    #[tokio::test]
    async fn subject_auth_error_maps_authentication_required_to_401() {
        let response = subject_auth_error(
            crate::subject::SubjectAuthError::AuthenticationRequired,
            None,
        );
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
        let json = response_json(response).await;
        assert_eq!(json["code"], 40101);
    }
}
