# Goofish (闲鱼) channel plugin

Status: **scaffold** — Rust runtime crate with capability modules; WebSocket transport pending (P2).

Reference: `external/xianyu-auto-reply`

## Capabilities

- Cookie session + captcha recovery
- Goofish WebSocket transport (`wss://wss-goofish.dingtalk.com/`)
- Chat/card/order messages
- Auto-delivery with registry-based block rules
- Keyword / AI / default auto-reply

## Migration notes

| xianyu-auto-reply | Host table |
| --- | --- |
| `XYAccount` | `communication_cs_channel_account` |
| cookie / `xy_token_cache` | `communication_cs_channel_account_credential` |
| `XYKeywordRule` | `communication_cs_auto_reply_rule` |
| `XYDeliveryBlockRule` | `communication_cs_delivery_block_rule` |
| `XYOrder` | `communication_cs_plugin_goofish_order` (overlay) |

Worker bridge: existing Python `websocket/` service can run behind internal control API until Rust runtime is ready.
