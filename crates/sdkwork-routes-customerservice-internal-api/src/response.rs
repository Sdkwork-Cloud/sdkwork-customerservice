use axum::http::{header, HeaderName, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::Json;
use sdkwork_communication_customerservice_service::CustomerServiceError;
use sdkwork_utils_rust::{
    SdkWorkApiResponse, SdkWorkCommandData, SdkWorkProblemDetail, SdkWorkResourceData,
    SdkWorkResultCode, SDKWORK_TRACE_ID_HEADER,
};
use sdkwork_web_core::{new_request_id, WebRequestContext};
use serde::Serialize;

pub fn resolved_trace_id(web_context: Option<&WebRequestContext>) -> String {
    web_context
        .map(WebRequestContext::resolved_trace_id)
        .unwrap_or_else(new_request_id)
}

fn attach_trace_header(response: &mut Response, trace_id: &str) {
    if let Ok(value) = HeaderValue::from_str(trace_id) {
        response
            .headers_mut()
            .insert(HeaderName::from_static(SDKWORK_TRACE_ID_HEADER), value);
    }
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

pub fn ok_resource<T: Serialize>(item: T, web_context: Option<&WebRequestContext>) -> Response {
    success_json(StatusCode::OK, SdkWorkResourceData { item }, web_context)
}

pub fn ok_command(web_context: Option<&WebRequestContext>) -> Response {
    success_json(StatusCode::OK, SdkWorkCommandData::accepted(), web_context)
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

pub fn not_found(message: &str, web_context: Option<&WebRequestContext>) -> Response {
    problem(SdkWorkResultCode::NotFound, message.to_owned(), web_context)
}

pub fn conflict(message: &str, web_context: Option<&WebRequestContext>) -> Response {
    problem(SdkWorkResultCode::Conflict, message.to_owned(), web_context)
}

pub fn service_unavailable(message: &str, web_context: Option<&WebRequestContext>) -> Response {
    problem(
        SdkWorkResultCode::ServiceUnavailable,
        message.to_owned(),
        web_context,
    )
}

pub fn runtime_error(
    error: sdkwork_communication_customerservice_plugin_runtime::PluginRuntimeError,
    web_context: Option<&WebRequestContext>,
) -> Response {
    match error {
        sdkwork_communication_customerservice_plugin_runtime::PluginRuntimeError::AccountNotFound => {
            not_found("channel account not found", web_context)
        }
        sdkwork_communication_customerservice_plugin_runtime::PluginRuntimeError::RuntimeNotActive => {
            conflict("account runtime is not active", web_context)
        }
        sdkwork_communication_customerservice_plugin_runtime::PluginRuntimeError::SessionNotConfigured(
            message,
        ) => bad_request(&message, web_context),
        sdkwork_communication_customerservice_plugin_runtime::PluginRuntimeError::PluginNotFound(
            message,
        ) => bad_request(&message, web_context),
        other => problem(SdkWorkResultCode::InternalError, other.to_string(), web_context),
    }
}
