use axum::Extension;
use sdkwork_iam_context_service::IamAppContext;
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct AppRuntimeSubject {
    pub tenant_id: Uuid,
    pub organization_id: Option<Uuid>,
    pub user_id: Uuid,
}

pub fn app_runtime_subject_from_extension(
    context: Option<Extension<IamAppContext>>,
) -> Result<AppRuntimeSubject, String> {
    let Some(Extension(context)) = context else {
        return Err("authenticated runtime context is required".to_owned());
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

fn parse_uuid(value: &str, field: &str) -> Result<Uuid, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(format!("authenticated runtime context {field} is required"));
    }
    Uuid::parse_str(trimmed)
        .map_err(|_| format!("authenticated runtime context {field} is invalid"))
}
