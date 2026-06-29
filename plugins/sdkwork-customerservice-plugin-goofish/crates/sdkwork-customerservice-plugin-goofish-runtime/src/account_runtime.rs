use std::sync::{Arc, RwLock};

use async_trait::async_trait;
use sdkwork_communication_customerservice_plugin_spi::{
    AccountRuntime, AccountRuntimeContext, ConnectionState, OutboundMessageResult,
    OutboundTextRequest, PluginError, PluginHostPorts,
};
use uuid::Uuid;

use crate::capabilities::{
    ingest::GoofishMessageIngestAdapter, protocol::extract_seller_user_id_from_cookie,
    transport::GoofishMessageTransport, websocket_worker::GoofishWebSocketWorker,
};

/// Per-account runtime (reference: `CookieManager` + `XianyuAsync`).
pub struct GoofishAccountRuntime {
    ctx: AccountRuntimeContext,
    host: Arc<dyn PluginHostPorts>,
    transport: GoofishMessageTransport,
    #[allow(dead_code)]
    ingest: GoofishMessageIngestAdapter,
    session_cookie: Option<String>,
    connection_state: Arc<RwLock<ConnectionState>>,
    worker: Option<GoofishWebSocketWorker>,
}

impl GoofishAccountRuntime {
    pub fn new(
        ctx: AccountRuntimeContext,
        host: Arc<dyn PluginHostPorts>,
        session_cookie: Option<String>,
    ) -> Self {
        Self {
            ctx,
            host,
            transport: GoofishMessageTransport::new_disconnected(),
            ingest: GoofishMessageIngestAdapter,
            session_cookie,
            connection_state: Arc::new(RwLock::new(ConnectionState::Disconnected)),
            worker: None,
        }
    }

    pub fn account_id(&self) -> Uuid {
        self.ctx.account_id
    }
}

#[async_trait]
impl AccountRuntime for GoofishAccountRuntime {
    async fn start(&mut self) -> Result<(), PluginError> {
        let cookie = self
            .session_cookie
            .clone()
            .ok_or_else(|| PluginError::Session("goofish cookie credential required".to_owned()))?;
        {
            let mut guard = self
                .connection_state
                .write()
                .map_err(|error| PluginError::Runtime(error.to_string()))?;
            *guard = ConnectionState::Connecting;
        }

        let seller_user_id = extract_seller_user_id_from_cookie(&cookie)?;
        let (transport, outbound_rx) = GoofishMessageTransport::new_pair();
        transport.set_seller_user_id(seller_user_id);

        let worker = GoofishWebSocketWorker::spawn(
            self.ctx.clone(),
            Arc::clone(&self.host),
            cookie,
            Arc::clone(&self.connection_state),
            transport.clone(),
            outbound_rx,
        )?;
        self.transport = transport;
        self.worker = Some(worker);
        Ok(())
    }

    async fn stop(&mut self) -> Result<(), PluginError> {
        if let Some(worker) = self.worker.take() {
            worker.cancel();
            worker.join().await;
        }
        self.transport = GoofishMessageTransport::new_disconnected();
        let mut guard = self
            .connection_state
            .write()
            .map_err(|error| PluginError::Runtime(error.to_string()))?;
        *guard = ConnectionState::Closed;
        Ok(())
    }

    fn connection_state(&self) -> ConnectionState {
        self.connection_state
            .read()
            .map(|guard| *guard)
            .unwrap_or(ConnectionState::Failed)
    }

    async fn send_text(
        &self,
        req: OutboundTextRequest,
    ) -> Result<OutboundMessageResult, PluginError> {
        if self.connection_state() != ConnectionState::Connected {
            return Err(PluginError::Transport(
                "goofish account runtime is not connected".to_owned(),
            ));
        }
        self.transport.send_text(req).await
    }
}

pub fn create_prepared_goofish_runtime(
    ctx: AccountRuntimeContext,
    host: Arc<dyn PluginHostPorts>,
    session_cookie: Option<String>,
) -> Box<dyn AccountRuntime> {
    Box::new(GoofishAccountRuntime::new(ctx, host, session_cookie))
}
