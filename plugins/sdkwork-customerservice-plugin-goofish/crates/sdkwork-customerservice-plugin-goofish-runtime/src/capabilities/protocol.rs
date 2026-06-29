use std::time::{SystemTime, UNIX_EPOCH};

use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde_json::{json, Value};

use sdkwork_communication_customerservice_plugin_spi::PluginError;

/// Strip `@goofish` suffix from IM identifiers.
pub fn strip_goofish_suffix(value: &str) -> String {
    value.split('@').next().unwrap_or(value).to_owned()
}

/// Extract seller user id from goofish cookie (`unb` or `munb`).
pub fn extract_seller_user_id_from_cookie(cookie: &str) -> Result<String, PluginError> {
    for part in cookie.split(';') {
        let part = part.trim();
        let Some((key, value)) = part.split_once('=') else {
            continue;
        };
        let key = key.trim();
        if key == "unb" || key == "munb" {
            let user_id = value.trim();
            if !user_id.is_empty() {
                return Ok(user_id.to_owned());
            }
        }
    }
    Err(PluginError::Session(
        "goofish cookie must include unb or munb field".to_owned(),
    ))
}

pub fn generate_mid() -> String {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0);
    let random_part = timestamp % 1000;
    format!("{random_part}{timestamp} 0")
}

pub fn generate_message_uuid() -> String {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0);
    format!("-{timestamp}1")
}

/// Build LWP text send frame (reference: `xianyu_async.send_msg`).
pub fn build_text_send_frame(
    chat_id: &str,
    recipient_user_id: &str,
    seller_user_id: &str,
    content: &str,
) -> Result<(String, String), PluginError> {
    let chat_id = strip_goofish_suffix(chat_id);
    let recipient_user_id = strip_goofish_suffix(recipient_user_id);
    let seller_user_id = strip_goofish_suffix(seller_user_id);

    if chat_id.is_empty() || recipient_user_id.is_empty() || seller_user_id.is_empty() {
        return Err(PluginError::Transport(
            "chatId, recipientUserId, and sellerUserId are required".to_owned(),
        ));
    }
    if content.trim().is_empty() {
        return Err(PluginError::Transport(
            "message body must not be empty".to_owned(),
        ));
    }

    let msg_content = json!({
        "contentType": 1,
        "text": { "text": content }
    });
    let content_json = serde_json::to_string(&msg_content)
        .map_err(|error| PluginError::Transport(error.to_string()))?;
    let content_base64 = STANDARD.encode(content_json.as_bytes());
    let mid = generate_mid();

    let frame = json!({
        "lwp": "/r/MessageSend/sendByReceiverScope",
        "headers": { "mid": mid.clone() },
        "body": [
            {
                "uuid": generate_message_uuid(),
                "cid": format!("{chat_id}@goofish"),
                "conversationType": 1,
                "content": {
                    "contentType": 101,
                    "custom": { "type": 1, "data": content_base64 }
                },
                "redPointPolicy": 0,
                "extension": { "extJson": "{}" },
                "ctx": { "appVersion": "1.0", "platform": "web" },
                "mtags": {},
                "msgReadStatusSetting": 1
            },
            {
                "actualReceivers": [
                    format!("{recipient_user_id}@goofish"),
                    format!("{seller_user_id}@goofish")
                ]
            }
        ]
    });

    Ok((
        serde_json::to_string(&frame).map_err(|error| PluginError::Transport(error.to_string()))?,
        mid,
    ))
}

/// ACK frame required by goofish websocket server (reference: `message_handler._send_ack`).
pub fn build_ack_frame(incoming: &Value) -> Option<String> {
    let headers = incoming.get("headers")?;
    let mut ack_headers = json!({
        "mid": headers.get("mid").and_then(Value::as_str).unwrap_or(""),
        "sid": headers.get("sid").and_then(Value::as_str).unwrap_or(""),
    });
    if ack_headers["mid"].as_str().unwrap_or("").is_empty() {
        ack_headers["mid"] = json!(generate_mid());
    }
    for key in ["app-key", "ua", "dt"] {
        if let Some(value) = headers.get(key) {
            ack_headers[key] = value.clone();
        }
    }
    serde_json::to_string(&json!({ "code": 200, "headers": ack_headers })).ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_unb_from_cookie() {
        let user_id = extract_seller_user_id_from_cookie("unb=12345; other=1").expect("unb");
        assert_eq!(user_id, "12345");
    }

    #[test]
    fn builds_send_frame_with_mid() {
        let (frame, mid) =
            build_text_send_frame("chat-1", "buyer-2", "seller-3", "hello").expect("frame");
        assert!(!mid.is_empty());
        assert!(frame.contains("/r/MessageSend/sendByReceiverScope"));
        assert!(frame.contains("chat-1@goofish"));
        assert!(frame.contains("buyer-2@goofish"));
    }
}
