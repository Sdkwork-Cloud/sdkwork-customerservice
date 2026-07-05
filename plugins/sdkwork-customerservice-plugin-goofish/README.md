# Goofish (闲鱼) channel plugin

Status: **planned post-launch** — Rust runtime crate ships capability modules and delivery-rule evaluation; live WebSocket worker transport is a PRD non-goal until marketplace adapters land.

Reference: `external/xianyu-auto-reply`

## Capabilities (runtime crate)

- Cookie session + captcha recovery (protocol helpers)
- Goofish WebSocket transport (`wss://wss-goofish.dingtalk.com/`) — worker bridge pending
- Chat/card/order message ingest helpers
- Auto-delivery with registry-based block rules
- Keyword / AI / default auto-reply rule evaluation

## Migration notes

| xianyu-auto-reply | Host table |
| --- | --- |
| `XYAccount` | `communication_cs_channel_account` |
| cookie / `xy_token_cache` | `communication_cs_channel_account_credential` |
| `XYKeywordRule` | `communication_cs_auto_reply_rule` |
| `XYDeliveryBlockRule` | `communication_cs_delivery_block_rule` |
| `XYOrder` | `communication_cs_plugin_goofish_order` (overlay) |

Worker bridge: existing Python `websocket/` service can run behind internal control API until Rust transport is production-ready.

See `docs/architecture/tech/GOOFISH_MIGRATION_ARCHITECTURE.md` and `docs/product/prd/PRD.md` (non-goals).
