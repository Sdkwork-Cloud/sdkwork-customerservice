use thiserror::Error;

#[derive(Debug, Error, PartialEq, Eq)]
pub enum CustomerServiceError {
    #[error("validation failed: {0}")]
    Validation(String),
    #[error("not found: {0}")]
    NotFound(String),
    #[error("forbidden: {0}")]
    Forbidden(String),
    #[error("persistence failed: {0}")]
    Persistence(String),
}
