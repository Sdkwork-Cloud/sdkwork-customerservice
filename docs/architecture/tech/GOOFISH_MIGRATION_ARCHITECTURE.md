# Goofish (闲鱼) Migration Architecture

- Version: 1.2.0
- Status: active — **launch scope complete** for core tickets + channel plugin host; live Goofish WebSocket worker remains post-launch (see PRD non-goals)
- Reference: `external/xianyu-auto-reply` (read-only; not imported at runtime)
- Target: `sdkwork-customerservice` communication/customerservice capability

## 1. Principle

`external/xianyu-auto-reply` is a **reference application** only. All production code lives in SDKWork-standard paths:

- **Host (Rust)** — ticket bridge, policy stores, admin HTTP, plugin orchestration
- **Plugin worker (Rust)** — Goofish session, WebSocket, protocol adapters
- **Client surfaces** — PC (operator), H5 (mobile web), Flutter (native mobile)
- **Shared TS/Dart packages** — contracts, client-core, surface-specific shells

No Python/MySQL runtime in the production path. Reference code informs behavior and API parity, not copy-paste.

## 2. Reference → Target mapping

| xianyu-auto-reply | SDKWork target | Phase |
| --- | --- | --- |
| `backend-web/` control API | Rust gateway + backend-api routes | P1–P3 |
| `websocket/` marketplace I/O | `plugin-goofish-runtime` worker | P2–P3 |
| `scheduler/` batch jobs | Host-scheduled tasks + worker hooks | P3–P4 |
| `common/models/xy_*` | `communication_cs_*` host + goofish overlay | P1–P2 |
| `frontend/` React admin | PC + H5 operator modules (SDK-backed) | P2–P3 |
| `launcher/` Windows EXE | Out of scope (use topology + deploy) | — |
| `promotion/` rebate subsystem | Separate capability (future) | — |

## 3. Backend module split (Rust)

```text
crates/                                    # Host (platform-agnostic)
  sdkwork-communication-customerservice-service/
  sdkwork-communication-customerservice-repository-sqlx/
  sdkwork-communication-customerservice-plugin-host/
  sdkwork-communication-customerservice-plugin-spi/
  sdkwork-communication-customerservice-plugin-runtime/
  sdkwork-routes-customerservice-{app,backend,internal}-api/
  sdkwork-customerservice-{gateway,service-host,database-host}/

plugins/sdkwork-customerservice-plugin-goofish/crates/
  sdkwork-customerservice-plugin-goofish-runtime/   # ChannelPlugin + AccountRuntime
    capabilities/
      session.rs          ← CookieManager, TokenManager, captcha recovery
      transport.rs        ← LWP `/r/MessageSend/sendByReceiverScope` outbound over worker socket
      ingest.rs           ← MessageHandler normalize → NormalizedChannelMessage
      websocket_worker.rs ← wss-goofish connect + inbound pipeline
      delivery_rules.rs   ← buyer_credit (fail-open), buyer_has_order, buyer_unconfirmed, personal_blacklist
      orders.rs           ← order sync + overlay persistence
      auto_reply.rs       ← plugin hints; host executes keyword rules
```

Host **never** imports Goofish protocol crates. Plugin **never** writes ticket tables directly; uses `PluginHostPorts`.

## 4. Capability parity matrix

| Capability | xianyu module | Host | Plugin | Admin API |
| --- | --- | --- | --- | --- |
| Seller accounts | `xy_accounts`, cookies routes | `communication_cs_channel_account` | session + runtime | `channels/accounts` CRUD |
| WebSocket chat | `xianyu_async.py` | conversation + message log | transport + ingest + worker | — |
| Runtime control | websocket start/stop | `PluginRuntimeManager` | AccountRuntime | `channels/accounts/{id}/runtime/*` (backend) + internal worker API |
| Auto-reply keywords | `xy_keyword_rules` | `communication_cs_auto_reply_rule` + host matcher | worker sends matched reply | `channels/auto_reply_rules` |
| Ticket bridge | chat → ticket | `bridge_to_ticket` on inbound persist | — | ticket admin APIs |
| Delivery block rules | `delivery_rules/*` | `communication_cs_delivery_block_rule` | host registry + DB-backed evaluate | `channels/delivery_block_rules` + account upsert + internal pre-check |
| Orders | `xy_orders` | ticket link | overlay `goofish_order` | planned |
| Virtual cards | `xy_cards` | — | overlay `goofish_fulfillment_card` | planned |
| Operator chat UI | `chat-new` | ticket messages + workbench | PC + H5 ticket workbench; channel admin PC/H5 |
| Auto-delivery | `auto_delivery_handler.py` | pre-check pipeline (planned) | execute send (stub) | internal worker API |
| Scheduler jobs | `scheduler/*` | task registry (planned) | job handlers | internal trigger |
| AI reply | `ai_reply_engine.py` | host engine + config (planned) | optional provider | planned |

## 5. Client surfaces

| Surface | App root | API surface | Primary user |
| --- | --- | --- | --- |
| PC | `apps/sdkwork-customerservice-pc` | backend-api (+ app-api attachments) | Operator / seller admin |
| H5 | `apps/sdkwork-customerservice-h5` | backend-api (mobile operator) + app-api (end-user mode) | Mobile operator / buyer |
| Flutter | `apps/sdkwork-customerservice-flutter` | app-api (+ backend for operator build) | Native mobile (post-launch placeholder) |

All three HTTP surfaces (app / backend / internal) serialize success as `SdkWorkApiResponse` and errors as `ProblemDetail`. OpenAPI contracts are normalized and aligned via `tools/customerservice_openapi_align.mjs` (typed list/resource envelopes, domain `required` fields, legacy wrapper removal) during `pnpm api:materialize`.

Shared packages:

```text
apps/sdkwork-customerservice-common/packages/
  sdkwork-customerservice-contracts/    # DTOs, labels
  sdkwork-customerservice-service/      # formatters, demo data
  sdkwork-customerservice-client-core/  # API URL, SDK factories (all web clients)
```

Surface packages (`pc-core`, `h5-core`) add session model and feature modules only.

## 6. Phased delivery

| Phase | Deliverable | Status |
| --- | --- | --- |
| P1 | Migration spec, plugin runtime crate, overlay DDL, client-core, H5 init, channel account create API | **done** (launch) |
| P2 (launch) | PC/H5 operator admin (tickets, channels, auto-reply, delivery block rules); DB-backed delivery rule evaluation + tenant plugin enablement; internal worker control API + ingress auth | **done** (launch) |
| P2 (post-launch) | Live Goofish WebSocket worker + production inbound/outbound pipeline; buyer_credit external API; auto-delivery execution | **planned** (PRD non-goals for current release) |
| P3 | Delivery rules CRUD extensions, order sync, card overlay APIs, real Goofish outbound protocol hardening | planned |
| P4 | Scheduler parity, AI reply, publish/monitor (optional product modules) | planned |

## 7. Inbound pipeline (implemented)

```text
GoofishWebSocketWorker
  → ingest.normalize
  → PluginHostPorts.persist_inbound_message
       → ensure_conversation + persist_channel_message
       → bridge_to_ticket (inbound only)
  → PluginHostPorts.run_auto_reply (keyword rules from DB)
  → transport.send_text (LWP frame via active websocket worker)
```

## 8. Verification

```bash
pnpm check:plugin
pnpm verify
pnpm test:postgres          # when CUSTOMER_SERVICE_DATABASE_URL is configured
cargo test -p sdkwork-customerservice-plugin-goofish
```

## 9. References

- `specs/PLUGIN_SYSTEM_SPEC.md`
- `docs/architecture/decisions/ADR-20250627-customerservice-channel-plugin-system.md`
- `plugins/sdkwork-customerservice-plugin-goofish/README.md`
