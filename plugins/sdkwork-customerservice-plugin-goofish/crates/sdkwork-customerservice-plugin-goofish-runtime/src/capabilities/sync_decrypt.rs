use rmpv::Value as RmpValue;
use serde_json::{Map, Number, Value};

/// Decode Goofish sync push payload: base64(JSON) first, then MessagePack fallback.
pub fn decode_sync_payload(data: &str) -> Option<Value> {
    let decoded_bytes = decode_base64_payload(data)?;
    if let Ok(text) = std::str::from_utf8(&decoded_bytes) {
        if let Ok(parsed) = serde_json::from_str::<Value>(text) {
            return filter_sync_message(parsed);
        }
    }
    let rmpv_value = rmpv::decode::read_value(&mut decoded_bytes.as_slice()).ok()?;
    filter_sync_message(rmpv_to_json(rmpv_value))
}

fn decode_base64_payload(data: &str) -> Option<Vec<u8>> {
    use base64::{engine::general_purpose::STANDARD, Engine as _};
    STANDARD.decode(data).ok().or_else(|| {
        let padding = (4 - data.len() % 4) % 4;
        if padding == 0 {
            return None;
        }
        STANDARD
            .decode(format!("{data}{}", "=".repeat(padding)))
            .ok()
    })
}

fn filter_sync_message(parsed: Value) -> Option<Value> {
    if parsed.get("chatType").is_some() {
        return None;
    }
    Some(parsed)
}

fn rmpv_to_json(value: RmpValue) -> Value {
    match value {
        RmpValue::Nil => Value::Null,
        RmpValue::Boolean(value) => Value::Bool(value),
        RmpValue::Integer(value) => {
            if let Some(number) = value.as_i64() {
                Value::Number(number.into())
            } else if let Some(number) = value.as_u64() {
                Value::Number(number.into())
            } else {
                Value::Null
            }
        }
        RmpValue::F32(value) => {
            Number::from_f64(f64::from(value)).map_or(Value::Null, Value::Number)
        }
        RmpValue::F64(value) => Number::from_f64(value).map_or(Value::Null, Value::Number),
        RmpValue::String(value) => Value::String(value.to_string()),
        RmpValue::Binary(value) => String::from_utf8(value)
            .map(Value::String)
            .unwrap_or(Value::Null),
        RmpValue::Array(values) => Value::Array(values.into_iter().map(rmpv_to_json).collect()),
        RmpValue::Map(values) => {
            let mut object = Map::new();
            for (key, entry) in values {
                let Some(key) = rmpv_key_to_string(key) else {
                    continue;
                };
                object.insert(key, rmpv_to_json(entry));
            }
            Value::Object(object)
        }
        RmpValue::Ext(_, value) => Value::String(String::from_utf8_lossy(&value).into_owned()),
    }
}

fn rmpv_key_to_string(value: RmpValue) -> Option<String> {
    match value {
        RmpValue::String(value) => Some(value.to_string()),
        RmpValue::Integer(value) => value.as_i64().map(|number| number.to_string()),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use base64::{engine::general_purpose::STANDARD, Engine as _};
    use serde_json::json;

    #[test]
    fn decodes_base64_json_sync_payload() {
        let payload = json!({"1":{"10":{"reminderContent":"hello"}}});
        let encoded = STANDARD.encode(payload.to_string());
        let decoded = decode_sync_payload(&encoded).expect("decoded");
        assert_eq!(
            decoded
                .pointer("/1/10/reminderContent")
                .and_then(Value::as_str),
            Some("hello")
        );
    }

    #[test]
    fn skips_chat_type_system_messages() {
        let payload = json!({"chatType":"system"});
        let encoded = STANDARD.encode(payload.to_string());
        assert!(decode_sync_payload(&encoded).is_none());
    }
}
