use thiserror::Error;

#[derive(Debug, Error)]
pub enum PluginError {
    #[error("plugin not found: {0}")]
    PluginNotFound(String),
    #[error("capability not supported: {0}")]
    CapabilityNotSupported(String),
    #[error("account runtime error: {0}")]
    Runtime(String),
    #[error("session error: {0}")]
    Session(String),
    #[error("transport error: {0}")]
    Transport(String),
    #[error("normalization error: {0}")]
    Normalization(String),
    #[error("host port error: {0}")]
    HostPort(String),
}
