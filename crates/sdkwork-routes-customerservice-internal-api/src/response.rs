use axum::http::{header, HeaderName, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::Json;
use sdkwork_communication_customerservice_service::CustomerServiceError;
use sdkwork_utils_rust::{
    SdkWorkApiResponse, SdkWorkCommandData, SdkWorkProblemDetail, SdkWorkResourceData,
    SdkWorkResultCode, SDKWORK_TRACE_ID_HEADER,
};
use sdkwork_web_core::new_request_id;
use serde::Serialize;

fn resolved_trace_id() -> String {
    new_request_id()
}

fn attach_trace_header(response: &mut Response, trace_id: &str) {
    if let Ok(value) = HeaderValue::from_str(trace_id) {
        response
            .headers_mut()
            .insert(HeaderName::from_static(SDKWORK_TRACE_ID_HEADER), value);
    }
}

fn success_json<T: Serialize>(status: StatusCode, data: T) -> Response {
    let trace_id = resolved_trace_id();
    let envelope = SdkWorkApiResponse::success(data, trace_id.clone());
    let mut response = (status, Json(envelope)).into_response();
    attach_trace_header(&mut response, &trace_id);
    response
}

fn problem(status_code: SdkWorkResultCode, detail: impl Into<String>) -> Response {
    let trace_id = resolved_trace_id();
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

pub fn ok_resource<T: Serialize>(item: T) -> Response {
    success_json(StatusCode::OK, SdkWorkResourceData { item })
}

pub fn ok_command() -> Response {
    success_json(StatusCode::OK, SdkWorkCommandData::accepted())
}

pub fn service_error(error: CustomerServiceError) -> Response {
    match error {
        CustomerServiceError::Validation(message) => {
            problem(SdkWorkResultCode::ValidationError, message)
        }
        CustomerServiceError::NotFound(message) => problem(SdkWorkResultCode::NotFound, message),
        CustomerServiceError::Forbidden(message) => {
            problem(SdkWorkResultCode::PermissionRequired, message)
        }
        CustomerServiceError::Persistence(message) => {
            problem(SdkWorkResultCode::InternalError, message)
        }
    }
}

pub fn bad_request(message: &str) -> Response {
    problem(SdkWorkResultCode::ValidationError, message.to_owned())
}

pub fn not_found(message: &str) -> Response {
    problem(SdkWorkResultCode::NotFound, message.to_owned())
}

pub fn conflict(message: &str) -> Response {
    problem(SdkWorkResultCode::Conflict, message.to_owned())
}

pub fn internal_error(message: impl Into<String>) -> Response {
    problem(SdkWorkResultCode::InternalError, message)
}
