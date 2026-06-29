use std::sync::Arc;

use futures_util::SinkExt;
use sdkwork_communication_customerservice_plugin_spi::{
    CreateConversationRequest, OutboundMessageResult, OutboundTextRequest, PluginError,
};
use tokio::sync::{mpsc, oneshot};
use tokio_tungstenite::tungstenite::Message;

use crate::capabilities::protocol::{build_text_send_frame, strip_goofish_suffix};

pub struct OutboundWsCommand {
    pub chat_id: String,
    pub recipient_user_id: String,
    pub body: String,
    pub respond_to: oneshot::Sender<Result<OutboundMessageResult, PluginError>>,
}

#[derive(Clone)]
pub struct GoofishMessageTransport {
    outbound_tx: Option<Arc<mpsc::Sender<OutboundWsCommand>>>,
    seller_user_id: Arc<std::sync::RwLock<Option<String>>>,
}

impl GoofishMessageTransport {
    pub fn new_disconnected() -> Self {
        Self {
            outbound_tx: None,
            seller_user_id: Arc::new(std::sync::RwLock::new(None)),
        }
    }

    pub fn new_pair() -> (Self, mpsc::Receiver<OutboundWsCommand>) {
        let (tx, rx) = mpsc::channel(64);
        (
            Self {
                outbound_tx: Some(Arc::new(tx)),
                seller_user_id: Arc::new(std::sync::RwLock::new(None)),
            },
            rx,
        )
    }

    pub fn set_seller_user_id(&self, seller_user_id: String) {
        if let Ok(mut guard) = self.seller_user_id.write() {
            *guard = Some(strip_goofish_suffix(&seller_user_id));
        }
    }

    pub async fn send_text(
        &self,
        req: OutboundTextRequest,
    ) -> Result<OutboundMessageResult, PluginError> {
        let recipient = req
            .external_recipient_id
            .as_deref()
            .map(strip_goofish_suffix)
            .filter(|value| !value.is_empty())
            .ok_or_else(|| {
                PluginError::Transport(
                    "externalRecipientId is required for goofish outbound send".to_owned(),
                )
            })?;

        let tx = self.outbound_tx.as_ref().ok_or_else(|| {
            PluginError::Transport("goofish websocket worker is not active".to_owned())
        })?;

        let (respond_to, response_rx) = oneshot::channel();
        tx.send(OutboundWsCommand {
            chat_id: strip_goofish_suffix(&req.external_conversation_id),
            recipient_user_id: recipient,
            body: req.body,
            respond_to,
        })
        .await
        .map_err(|error| PluginError::Transport(error.to_string()))?;

        response_rx
            .await
            .map_err(|error| PluginError::Transport(error.to_string()))?
    }

    pub async fn dispatch_outbound<S>(
        &self,
        command: OutboundWsCommand,
        socket: &mut S,
    ) -> Result<(), PluginError>
    where
        S: SinkExt<Message> + Unpin,
        S::Error: std::fmt::Display,
    {
        let seller_user_id = self
            .seller_user_id
            .read()
            .map_err(|error| PluginError::Runtime(error.to_string()))?
            .clone()
            .ok_or_else(|| {
                PluginError::Session("goofish seller user id is not configured".to_owned())
            })?;

        let (frame, mid) = build_text_send_frame(
            &command.chat_id,
            &command.recipient_user_id,
            &seller_user_id,
            &command.body,
        )?;

        socket
            .send(Message::Text(frame.into()))
            .await
            .map_err(|error| PluginError::Transport(error.to_string()))?;

        let _ = command.respond_to.send(Ok(OutboundMessageResult {
            external_message_id: mid,
        }));
        Ok(())
    }

    pub async fn create_conversation(
        &self,
        _req: CreateConversationRequest,
    ) -> Result<String, PluginError> {
        Err(PluginError::Transport(
            "goofish conversations are opened by inbound buyer messages".to_owned(),
        ))
    }
}

impl Default for GoofishMessageTransport {
    fn default() -> Self {
        Self::new_disconnected()
    }
}
