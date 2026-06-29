use chrono::{TimeZone, Utc};
use sdkwork_communication_customerservice_plugin_spi::{
    MessageDirection, MessageKind, NormalizedChannelMessage, PluginError, RawChannelFrame,
};
use serde_json::Value;

/// Inbound frame normalization (reference: `message_handler.py`, `chat_new._parse_message`).
pub struct GoofishMessageIngestAdapter;

impl GoofishMessageIngestAdapter {
    pub fn normalize(
        &self,
        raw: &RawChannelFrame,
    ) -> Result<NormalizedChannelMessage, PluginError> {
        if let Some(mut parsed) = self.parse_goofish_chat_message(&raw.payload) {
            parsed.raw = raw.payload.clone();
            return Ok(parsed);
        }

        let external_message_id = raw
            .payload
            .get("messageId")
            .or_else(|| raw.payload.get("msgId"))
            .and_then(|value| value.as_str())
            .unwrap_or("unknown")
            .to_owned();

        Ok(NormalizedChannelMessage {
            external_message_id,
            external_conversation_id: raw
                .payload
                .get("conversationId")
                .and_then(|value| value.as_str())
                .unwrap_or("unknown")
                .to_owned(),
            external_buyer_id: raw
                .payload
                .get("buyerId")
                .and_then(|value| value.as_str())
                .map(str::to_owned),
            external_item_id: raw
                .payload
                .get("itemId")
                .and_then(|value| value.as_str())
                .map(str::to_owned),
            direction: MessageDirection::Inbound,
            message_kind: MessageKind::Chat,
            body: raw
                .payload
                .get("text")
                .and_then(|value| value.as_str())
                .unwrap_or("")
                .to_owned(),
            sender_external_id: None,
            sender_display_name: None,
            occurred_at: raw.received_at,
            raw: raw.payload.clone(),
        })
    }

    pub fn expand_inbound_messages(payload: &Value) -> Vec<Value> {
        let mut messages = Vec::new();
        if let Some(sync_data) = payload
            .pointer("/body/syncPushPackage/data")
            .and_then(Value::as_array)
        {
            for entry in sync_data {
                if let Some(decoded) = decode_sync_entry(entry) {
                    messages.push(decoded);
                }
            }
        } else {
            messages.push(payload.clone());
        }
        messages
    }

    fn parse_goofish_chat_message(&self, message: &Value) -> Option<NormalizedChannelMessage> {
        if is_card_update_message(message) {
            return self.parse_card_update_message(message);
        }
        if is_chat_message(message) {
            return self.parse_standard_chat_message(message);
        }
        None
    }

    fn parse_standard_chat_message(&self, message: &Value) -> Option<NormalizedChannelMessage> {
        let message_1 = message.get("1")?;
        let message_10 = message_1.get("10")?;
        let chat_id_raw = message_1.get("2").and_then(Value::as_str).unwrap_or("");
        let chat_id = strip_suffix(chat_id_raw);
        let reminder_content = message_10.get("reminderContent").and_then(Value::as_str)?;
        if reminder_content.is_empty() {
            return None;
        }
        if is_system_tip_message(message_10) {
            return None;
        }

        let sender_id = message_10
            .get("senderUserId")
            .and_then(Value::as_str)
            .map(strip_suffix)
            .unwrap_or_else(|| "unknown".to_owned());
        let sender_name = message_10
            .get("senderNick")
            .or_else(|| message_10.get("reminderTitle"))
            .and_then(Value::as_str)
            .unwrap_or("系统")
            .to_owned();
        let item_id = extract_item_id(message_10);
        let message_id =
            extract_message_id(message).unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
        let occurred_at = message_1
            .get("5")
            .and_then(Value::as_i64)
            .and_then(|millis| Utc.timestamp_millis_opt(millis).single())
            .unwrap_or_else(Utc::now);

        Some(NormalizedChannelMessage {
            external_message_id: message_id,
            external_conversation_id: chat_id,
            external_buyer_id: Some(sender_id.clone()),
            external_item_id: item_id,
            direction: MessageDirection::Inbound,
            message_kind: MessageKind::Chat,
            body: reminder_content.to_owned(),
            sender_external_id: Some(sender_id),
            sender_display_name: Some(sender_name),
            occurred_at,
            raw: message.clone(),
        })
    }

    fn parse_card_update_message(&self, message: &Value) -> Option<NormalizedChannelMessage> {
        let message_4 = message.get("4")?;
        let chat_id_raw = message.get("2").and_then(Value::as_str).unwrap_or("");
        let chat_id = strip_suffix(chat_id_raw);
        let reminder_content = message_4.get("reminderContent").and_then(Value::as_str)?;
        if reminder_content.is_empty() {
            return None;
        }
        let sender_id = message_4
            .get("senderUserId")
            .and_then(Value::as_str)
            .map(strip_suffix)
            .unwrap_or_else(|| "unknown".to_owned());
        let sender_name = message_4
            .get("reminderTitle")
            .and_then(Value::as_str)
            .unwrap_or("系统")
            .to_owned();
        let message_id =
            extract_message_id(message).unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
        let occurred_at = message
            .get("5")
            .and_then(Value::as_i64)
            .and_then(|millis| Utc.timestamp_millis_opt(millis).single())
            .unwrap_or_else(Utc::now);

        Some(NormalizedChannelMessage {
            external_message_id: message_id,
            external_conversation_id: chat_id,
            external_buyer_id: Some(sender_id.clone()),
            external_item_id: extract_item_id(message_4),
            direction: MessageDirection::Inbound,
            message_kind: MessageKind::Card,
            body: reminder_content.to_owned(),
            sender_external_id: Some(sender_id),
            sender_display_name: Some(sender_name),
            occurred_at,
            raw: message.clone(),
        })
    }
}

fn decode_sync_entry(entry: &Value) -> Option<Value> {
    let data = entry.get("data")?.as_str()?;
    super::sync_decrypt::decode_sync_payload(data)
}

fn is_chat_message(message: &Value) -> bool {
    message
        .pointer("/1/10/reminderContent")
        .and_then(Value::as_str)
        .is_some_and(|value| !value.is_empty())
}

fn is_card_update_message(message: &Value) -> bool {
    message.get("1").and_then(Value::as_str).is_some()
        && message
            .pointer("/4/reminderContent")
            .and_then(Value::as_str)
            .is_some()
}

fn is_system_tip_message(message_10: &Value) -> bool {
    let ext_json = message_10
        .get("extJson")
        .and_then(Value::as_str)
        .unwrap_or("");
    if ext_json.is_empty() {
        return false;
    }
    serde_json::from_str::<Value>(ext_json)
        .ok()
        .and_then(|value| {
            value
                .get("msgArg1")
                .and_then(Value::as_str)
                .map(str::to_owned)
        })
        == Some("MsgTips".to_owned())
}

fn strip_suffix(value: &str) -> String {
    value.split('@').next().unwrap_or(value).to_owned()
}

fn extract_item_id(message_10: &Value) -> Option<String> {
    let url_info = message_10
        .get("reminderUrl")
        .and_then(Value::as_str)
        .unwrap_or("");
    if let Some(item_id) = url_info
        .split("itemId=")
        .nth(1)
        .and_then(|segment| segment.split('&').next())
        .filter(|value| !value.is_empty())
    {
        return Some(item_id.to_owned());
    }
    message_10
        .get("extJson")
        .and_then(Value::as_str)
        .and_then(|ext_json| serde_json::from_str::<Value>(ext_json).ok())
        .and_then(|value| {
            value
                .get("itemId")
                .and_then(Value::as_str)
                .map(str::to_owned)
        })
}

fn extract_message_id(message: &Value) -> Option<String> {
    if let Some(message_id) = message
        .pointer("/1/10/bizTag")
        .and_then(Value::as_str)
        .and_then(|biz_tag| serde_json::from_str::<Value>(biz_tag).ok())
        .and_then(|value| {
            value
                .get("messageId")
                .and_then(Value::as_str)
                .map(str::to_owned)
        })
    {
        return Some(message_id);
    }
    message
        .pointer("/1/10/extJson")
        .and_then(Value::as_str)
        .and_then(|ext_json| serde_json::from_str::<Value>(ext_json).ok())
        .and_then(|value| {
            value
                .get("messageId")
                .and_then(Value::as_str)
                .map(str::to_owned)
        })
        .or_else(|| {
            message
                .pointer("/4/extJson")
                .and_then(Value::as_str)
                .and_then(|ext_json| serde_json::from_str::<Value>(ext_json).ok())
                .and_then(|value| {
                    value
                        .get("messageId")
                        .and_then(Value::as_str)
                        .map(str::to_owned)
                })
        })
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn parses_standard_chat_message() {
        let adapter = GoofishMessageIngestAdapter;
        let message = json!({
            "1": {
                "2": "chat123@goofish",
                "5": 1_700_000_000_000_i64,
                "10": {
                    "senderUserId": "buyer1@goofish",
                    "senderNick": "Buyer",
                    "reminderContent": "你好"
                }
            }
        });
        let normalized = adapter
            .parse_goofish_chat_message(&message)
            .expect("parsed");
        assert_eq!(normalized.external_conversation_id, "chat123");
        assert_eq!(normalized.body, "你好");
        assert_eq!(normalized.external_buyer_id.as_deref(), Some("buyer1"));
    }
}
