use sdkwork_utils_rust::{is_blank, is_uuid};

use crate::CustomerServiceError;

pub fn require_non_blank(value: &str, field: &str) -> Result<String, CustomerServiceError> {
    if is_blank(Some(value)) {
        return Err(CustomerServiceError::Validation(format!(
            "{field} is required"
        )));
    }
    Ok(value.trim().to_owned())
}

pub fn require_uuid(value: &str, field: &str) -> Result<String, CustomerServiceError> {
    let trimmed = require_non_blank(value, field)?;
    if !is_uuid(&trimmed) {
        return Err(CustomerServiceError::Validation(format!(
            "{field} must be a valid UUID"
        )));
    }
    Ok(trimmed)
}

pub fn normalize_ticket_status(value: &str) -> Result<String, CustomerServiceError> {
    let status = require_non_blank(value, "status")?.to_ascii_lowercase();
    match status.as_str() {
        "open" | "pending" | "resolved" | "closed" => Ok(status),
        _ => Err(CustomerServiceError::Validation(
            "status must be one of open, pending, resolved, closed".to_owned(),
        )),
    }
}

pub fn normalize_priority(value: &str) -> Result<String, CustomerServiceError> {
    let priority = require_non_blank(value, "priority")?.to_ascii_lowercase();
    match priority.as_str() {
        "low" | "normal" | "high" | "urgent" => Ok(priority),
        _ => Err(CustomerServiceError::Validation(
            "priority must be one of low, normal, high, urgent".to_owned(),
        )),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_uuid_and_status() {
        assert!(require_uuid("550e8400-e29b-41d4-a716-446655440000", "driveNodeId").is_ok());
        assert!(normalize_ticket_status("open").is_ok());
        assert!(normalize_ticket_status("invalid").is_err());
    }
}
