use std::sync::{Arc, RwLock};

use futures_util::{SinkExt, StreamExt};
use sdkwork_communication_customerservice_plugin_spi::{
    AccountRuntimeContext, ConnectionState, OutboundTextRequest, PluginError, PluginHostPorts,
    RawChannelFrame,
};
use tokio::sync::mpsc;
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::Message;
use tokio_util::sync::CancellationToken;

use crate::capabilities::ingest::GoofishMessageIngestAdapter;
use crate::capabilities::protocol::build_ack_frame;
use crate::capabilities::transport::{GoofishMessageTransport, OutboundWsCommand};

const GOOFISH_WS_URL: &str = "wss://wss-goofish.dingtalk.com/";

pub struct GoofishWebSocketWorker {
    cancel: CancellationToken,
    join: tokio::task::JoinHandle<()>,
}

impl GoofishWebSocketWorker {
    pub fn spawn(
        ctx: AccountRuntimeContext,
        host: Arc<dyn PluginHostPorts>,
        cookie: String,
        connection_state: Arc<RwLock<ConnectionState>>,
        transport: GoofishMessageTransport,
        mut outbound_rx: mpsc::Receiver<OutboundWsCommand>,
    ) -> Result<Self, PluginError> {
        if !cookie.contains("unb=") && !cookie.contains("munb=") {
            return Err(PluginError::Session(
                "goofish cookie must include unb or munb field".to_owned(),
            ));
        }

        let cancel = CancellationToken::new();
        let child_cancel = cancel.child_token();
        let join = tokio::spawn(async move {
            if let Err(error) = run_worker(
                ctx,
                host,
                cookie,
                child_cancel,
                connection_state,
                transport,
                &mut outbound_rx,
            )
            .await
            {
                tracing::warn!(%error, "goofish websocket worker stopped");
            }
        });

        Ok(Self { cancel, join })
    }

    pub fn cancel(&self) {
        self.cancel.cancel();
    }

    pub async fn join(self) {
        let _ = self.join.await;
    }
}

async fn run_worker(
    ctx: AccountRuntimeContext,
    host: Arc<dyn PluginHostPorts>,
    cookie: String,
    cancel: CancellationToken,
    connection_state: Arc<RwLock<ConnectionState>>,
    transport: GoofishMessageTransport,
    outbound_rx: &mut mpsc::Receiver<OutboundWsCommand>,
) -> Result<(), PluginError> {
    let request = tokio_tungstenite::tungstenite::http::Request::builder()
        .uri(GOOFISH_WS_URL)
        .header("Cookie", cookie.as_str())
        .header("Origin", "https://www.goofish.com")
        .header(
            "User-Agent",
            "Mozilla/5.0 (compatible; SDKWork-CustomerService/0.1)",
        )
        .body(())
        .map_err(|error| PluginError::Transport(error.to_string()))?;

    let (mut socket, _) = connect_async(request)
        .await
        .map_err(|error| PluginError::Transport(error.to_string()))?;

    {
        let mut guard = connection_state
            .write()
            .map_err(|error| PluginError::Runtime(error.to_string()))?;
        *guard = ConnectionState::Connected;
    }

    let ingest = GoofishMessageIngestAdapter;
    loop {
        tokio::select! {
            _ = cancel.cancelled() => break,
            outbound = outbound_rx.recv() => {
                let Some(command) = outbound else {
                    break;
                };
                transport.dispatch_outbound(command, &mut socket).await?;
            }
            incoming = socket.next() => {
                match incoming {
                    Some(Ok(Message::Text(text))) => {
                        let text_body = text.to_string();
                        let payload: serde_json::Value = serde_json::from_str(&text_body)
                            .unwrap_or_else(|_| serde_json::json!({ "text": text_body }));

                        if let Some(ack) = build_ack_frame(&payload) {
                            let _ = socket.send(Message::Text(ack.into())).await;
                        }

                        for inner in GoofishMessageIngestAdapter::expand_inbound_messages(&payload) {
                            let raw = RawChannelFrame {
                                payload: inner,
                                received_at: chrono::Utc::now(),
                            };
                            if let Ok(normalized) = ingest.normalize(&raw) {
                                if host
                                    .persist_inbound_message(&ctx, normalized.clone())
                                    .await
                                    .is_ok()
                                {
                                    if let Ok(Some(reply)) =
                                        host.run_auto_reply(&ctx, &normalized).await
                                    {
                                        let _ = transport
                                            .send_text(OutboundTextRequest {
                                                external_conversation_id: normalized
                                                    .external_conversation_id
                                                    .clone(),
                                                external_recipient_id: normalized.external_buyer_id.clone(),
                                                body: reply.body,
                                            })
                                            .await;
                                    }
                                }
                            }
                        }
                    }
                    Some(Ok(Message::Ping(payload))) => {
                        let _ = socket.send(Message::Pong(payload)).await;
                    }
                    Some(Ok(Message::Close(_))) | None => break,
                    Some(Err(error)) => {
                        return Err(PluginError::Transport(error.to_string()));
                    }
                    _ => {}
                }
            }
        }
    }

    let mut guard = connection_state
        .write()
        .map_err(|error| PluginError::Runtime(error.to_string()))?;
    *guard = ConnectionState::Closed;
    Ok(())
}
