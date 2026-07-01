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

#[cfg(test)]
mod tests {
    use super::*;
    use sdkwork_iam_context_service::{AuthLevel, DeploymentMode, Environment, IamAppContext};

    fn test_context(
        tenant_id: &str,
        user_id: &str,
        organization_id: Option<&str>,
    ) -> IamAppContext {
        IamAppContext::new(
            tenant_id,
            organization_id,
            user_id,
            "session-test",
            "app-test",
            Environment::Dev,
            DeploymentMode::Local,
            AuthLevel::Password,
            Vec::new(),
            Vec::new(),
        )
    }

    #[test]
    fn missing_context_returns_authentication_required() {
        let result = app_runtime_subject_from_extension(None);
        assert!(matches!(
            result,
            Err(SubjectAuthError::AuthenticationRequired)
        ));
    }

    #[test]
    fn valid_context_maps_subject_fields() {
        let tenant_id = Uuid::new_v4();
        let user_id = Uuid::new_v4();
        let organization_id = Uuid::new_v4();
        let context = test_context(
            &tenant_id.to_string(),
            &user_id.to_string(),
            Some(&organization_id.to_string()),
        );
        let subject =
            app_runtime_subject_from_extension(Some(Extension(context))).expect("subject");
        assert_eq!(subject.tenant_id, tenant_id);
        assert_eq!(subject.user_id, user_id);
        assert_eq!(subject.organization_id, Some(organization_id));
    }

    #[test]
    fn invalid_tenant_id_returns_invalid_context() {
        let context = test_context("not-a-uuid", &Uuid::new_v4().to_string(), None);
        let result = app_runtime_subject_from_extension(Some(Extension(context)));
        assert!(matches!(result, Err(SubjectAuthError::InvalidContext(_))));
    }
}
