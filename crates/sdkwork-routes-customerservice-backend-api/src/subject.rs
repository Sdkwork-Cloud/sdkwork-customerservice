use axum::Extension;
use sdkwork_iam_context_service::IamAppContext;
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct AppRuntimeSubject {
    pub tenant_id: Uuid,
    pub organization_id: Option<Uuid>,
    pub user_id: Uuid,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SubjectAuthError {
    AuthenticationRequired,
    InvalidContext(String),
}

pub fn app_runtime_subject_from_extension(
    context: Option<Extension<IamAppContext>>,
) -> Result<AppRuntimeSubject, SubjectAuthError> {
    let Some(Extension(context)) = context else {
        return Err(SubjectAuthError::AuthenticationRequired);
    };
    let tenant_id = parse_uuid(&context.tenant_id, "tenant_id")?;
    let user_id = parse_uuid(&context.user_id, "user_id")?;
    let organization_id = context
        .organization_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(|value| parse_uuid(value, "organization_id"))
        .transpose()?;

    Ok(AppRuntimeSubject {
        tenant_id,
        organization_id,
        user_id,
    })
}

fn parse_uuid(value: &str, field: &str) -> Result<Uuid, SubjectAuthError> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(SubjectAuthError::InvalidContext(format!(
            "authenticated runtime context {field} is required"
        )));
    }
    Uuid::parse_str(trimmed).map_err(|_| {
        SubjectAuthError::InvalidContext(format!(
            "authenticated runtime context {field} is invalid"
        ))
    })
}
