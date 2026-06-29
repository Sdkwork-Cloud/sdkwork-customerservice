use std::collections::HashMap;
use std::sync::Arc;

use sdkwork_communication_customerservice_plugin_spi::{
    AccountRuntime, AccountRuntimeContext, ChannelPlugin, ConnectionState, OutboundTextRequest,
    PluginError, PluginHostPorts,
};
use sdkwork_communication_customerservice_service::{
    ChannelPluginRepository, CustomerServiceRepository,
};
use sdkwork_customerservice_plugin_goofish::{
    create_prepared_goofish_runtime, GoofishChannelPlugin,
};
use tokio::sync::Mutex;
use uuid::Uuid;

#[derive(Debug, thiserror::Error)]
pub enum PluginRuntimeError {
    #[error("plugin not found: {0}")]
    PluginNotFound(String),
    #[error("account not found")]
    AccountNotFound,
    #[error("account runtime not active")]
    RuntimeNotActive,
    #[error("session not configured: {0}")]
    SessionNotConfigured(String),
    #[error("plugin error: {0}")]
    Plugin(#[from] PluginError),
    #[error("persistence error: {0}")]
    Persistence(String),
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AccountRuntimeStatus {
    pub account_id: Uuid,
    pub plugin_code: String,
    pub connection_state: String,
    pub worker_active: bool,
}

#[derive(Debug, Clone)]
pub struct SendChannelTextCommand {
    pub account_id: Uuid,
    pub external_conversation_id: String,
    pub external_recipient_id: Option<String>,
    pub body: String,
}

struct ManagedRuntime {
    plugin_code: String,
    tenant_id: Uuid,
    runtime: Arc<Mutex<Box<dyn AccountRuntime>>>,
}

pub struct PluginRuntimeManager<R> {
    plugins: HashMap<String, Arc<dyn ChannelPlugin>>,
    runtimes: Mutex<HashMap<Uuid, ManagedRuntime>>,
    plugin_ports: Arc<dyn PluginHostPorts>,
    repository: Arc<R>,
}

impl<R> PluginRuntimeManager<R>
where
    R: CustomerServiceRepository + ChannelPluginRepository + Send + Sync + 'static,
{
    pub fn new(plugin_ports: Arc<dyn PluginHostPorts>, repository: Arc<R>) -> Self {
        let mut plugins: HashMap<String, Arc<dyn ChannelPlugin>> = HashMap::new();
        plugins.insert(
            "goofish".to_owned(),
            Arc::new(GoofishChannelPlugin) as Arc<dyn ChannelPlugin>,
        );
        Self {
            plugins,
            runtimes: Mutex::new(HashMap::new()),
            plugin_ports,
            repository,
        }
    }

    pub async fn start_account(
        &self,
        account_id: Uuid,
    ) -> Result<AccountRuntimeStatus, PluginRuntimeError> {
        let account = self
            .repository
            .get_channel_account_by_id(account_id)
            .await
            .map_err(|error| PluginRuntimeError::Persistence(error.to_string()))?
            .ok_or(PluginRuntimeError::AccountNotFound)?;

        let plugin = self
            .plugins
            .get(&account.plugin_code)
            .ok_or_else(|| PluginRuntimeError::PluginNotFound(account.plugin_code.clone()))?;

        let cookie = self
            .repository
            .load_channel_credential(account.tenant_id, account_id, "cookie")
            .await
            .map_err(|error| PluginRuntimeError::Persistence(error.to_string()))?;

        let ctx = AccountRuntimeContext {
            tenant_id: account.tenant_id,
            account_id,
            plugin_code: account.plugin_code.clone(),
        };

        let runtime: Box<dyn AccountRuntime> = if account.plugin_code == "goofish" {
            let cookie_text = cookie.ok_or_else(|| {
                PluginRuntimeError::SessionNotConfigured(
                    "goofish cookie credential required; register via channels/accounts/{id}/credentials"
                        .to_owned(),
                )
            })?;
            create_prepared_goofish_runtime(ctx, Arc::clone(&self.plugin_ports), Some(cookie_text))
        } else {
            plugin.create_account_runtime(ctx, Arc::clone(&self.plugin_ports))?
        };

        let shared = Arc::new(Mutex::new(runtime));
        {
            let mut guard = shared.lock().await;
            guard.start().await?;
            let state = connection_state_label(guard.connection_state());
            self.repository
                .update_channel_account_runtime_state(
                    account.tenant_id,
                    account_id,
                    &state,
                    None,
                    None,
                )
                .await
                .map_err(|error| PluginRuntimeError::Persistence(error.to_string()))?;
        }

        self.runtimes.lock().await.insert(
            account_id,
            ManagedRuntime {
                plugin_code: account.plugin_code,
                tenant_id: account.tenant_id,
                runtime: Arc::clone(&shared),
            },
        );

        self.status(account_id).await
    }

    pub async fn stop_account(
        &self,
        account_id: Uuid,
    ) -> Result<AccountRuntimeStatus, PluginRuntimeError> {
        let managed = self
            .runtimes
            .lock()
            .await
            .remove(&account_id)
            .ok_or(PluginRuntimeError::RuntimeNotActive)?;

        {
            let mut guard = managed.runtime.lock().await;
            guard.stop().await?;
        }

        self.repository
            .update_channel_account_runtime_state(
                managed.tenant_id,
                account_id,
                "closed",
                None,
                None,
            )
            .await
            .map_err(|error| PluginRuntimeError::Persistence(error.to_string()))?;

        Ok(AccountRuntimeStatus {
            account_id,
            plugin_code: managed.plugin_code,
            connection_state: "closed".to_owned(),
            worker_active: false,
        })
    }

    pub async fn status(
        &self,
        account_id: Uuid,
    ) -> Result<AccountRuntimeStatus, PluginRuntimeError> {
        if let Some(managed) = self.runtimes.lock().await.get(&account_id) {
            let guard = managed.runtime.lock().await;
            return Ok(AccountRuntimeStatus {
                account_id,
                plugin_code: managed.plugin_code.clone(),
                connection_state: connection_state_label(guard.connection_state()),
                worker_active: true,
            });
        }

        let account = self
            .repository
            .get_channel_account_by_id(account_id)
            .await
            .map_err(|error| PluginRuntimeError::Persistence(error.to_string()))?
            .ok_or(PluginRuntimeError::AccountNotFound)?;

        Ok(AccountRuntimeStatus {
            account_id,
            plugin_code: account.plugin_code,
            connection_state: account
                .connection_state
                .unwrap_or_else(|| "disconnected".to_owned()),
            worker_active: false,
        })
    }

    pub async fn send_text(
        &self,
        command: SendChannelTextCommand,
    ) -> Result<String, PluginRuntimeError> {
        let recipient = match command
            .external_recipient_id
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
        {
            Some(recipient) => recipient.to_owned(),
            None => self
                .repository
                .get_conversation_external_buyer(command.account_id, &command.external_conversation_id)
                .await
                .map_err(|error| PluginRuntimeError::Persistence(error.to_string()))?
                .ok_or_else(|| {
                    PluginRuntimeError::SessionNotConfigured(
                        "conversation buyer is unknown; wait for an inbound message or pass externalRecipientId"
                            .to_owned(),
                    )
                })?,
        };

        let (runtime, plugin_code) = {
            let runtimes = self.runtimes.lock().await;
            let managed = runtimes
                .get(&command.account_id)
                .ok_or(PluginRuntimeError::RuntimeNotActive)?;
            (Arc::clone(&managed.runtime), managed.plugin_code.clone())
        };

        if plugin_code != "goofish" {
            return Err(PluginRuntimeError::Plugin(
                PluginError::CapabilityNotSupported("outbound text".to_owned()),
            ));
        }

        let guard = runtime.lock().await;
        let result = guard
            .send_text(OutboundTextRequest {
                external_conversation_id: command.external_conversation_id,
                external_recipient_id: Some(recipient),
                body: command.body,
            })
            .await?;
        Ok(result.external_message_id)
    }
}

fn connection_state_label(state: ConnectionState) -> String {
    match state {
        ConnectionState::Disconnected => "disconnected",
        ConnectionState::Connecting => "connecting",
        ConnectionState::Connected => "connected",
        ConnectionState::Reconnecting => "reconnecting",
        ConnectionState::Failed => "failed",
        ConnectionState::Closed => "closed",
    }
    .to_owned()
}
