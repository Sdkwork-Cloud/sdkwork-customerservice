# Customer Service Channel Plugin System

- Version: 0.1.0
- Status: active (host tables + SPI; marketplace workers planned per plugin registry)
- Domain: `communication`
- Capability: `customerservice`
- Canonical specs: `../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md`, `MODULE_SPEC.md`, `DATABASE_SPEC.md`, `DATABASE_FRAMEWORK_SPEC.md`, `SCHEMA_REGISTRY_SPEC.md`, `API_SPEC.md`, `WEB_BACKEND_SPEC.md`, `SECURITY_SPEC.md`, `NAMING_SPEC.md`, `RUST_CODE_SPEC.md`

This document defines the **runtime plugin system** for marketplace customer-service channels (闲鱼/Goofish, 淘宝/Taobao, and future platforms). It narrows root SDKWork standards for this repository only.

## 1. Goals

| Goal | Description |
| --- | --- |
| Platform isolation | Each marketplace implements a plugin; core ticket lifecycle stays platform-agnostic. |
| Account-per-runtime | One seller account maps to one plugin runtime instance (pattern from `external/xianyu-auto-reply` `CookieManager` + `XianyuAsync`). |
| Control / data plane split | Admin CRUD and ticket APIs live in the HTTP gateway; long-lived marketplace I/O runs in plugin workers. |
| Composable persistence | Host owns cross-platform tables; plugins may register DDL overlays via schema registry composition. |
| Deterministic extension | Plugins implement SPI traits; host orchestrates message pipeline, ticket bridge, and policy engines. |

## 2. Non-goals (phase 1)

- Shipping full Goofish/Taobao protocol implementations in this spec iteration.
- Replacing `external/xianyu-auto-reply`; it remains a reference implementation for migration.
- gRPC plugin RPC (`sdkwork-discovery` deferred per PRD).
- Real-time operator push (future messaging integration).

## 3. Terminology

| Term | Meaning |
| --- | --- |
| `plugin_code` | Stable platform identifier, lowercase kebab-case (`goofish`, `taobao`). |
| Channel account | Tenant-bound seller session on a marketplace. |
| Host | `sdkwork-customerservice` core: registry, ticket bridge, policy store, HTTP APIs. |
| Plugin worker | Long-running process or in-process task executing marketplace transport. |
| Normalized message | Platform-agnostic envelope produced by a plugin adapter. |
| Ticket bridge | Maps channel conversations/messages to `communication_cs_ticket*`. |

## 4. Architecture

### 4.1 Layering

```text
HTTP gateway (app-api / backend-api)
  -> ChannelAdminService / TicketService (host domain)
  -> PluginHost (registry, lifecycle, internal control API)
  -> Plugin SPI traits (transport, session, capabilities)
  -> Plugin runtime packages under plugins/

Plugin worker (optional separate process per topology profile)
  -> Marketplace WebSocket / HTTP protocol
  -> Callbacks -> host message pipeline
```

### 4.2 Process topology

| Profile | Plugin execution |
| --- | --- |
| `standalone.unified-process.development` | In-process Tokio tasks inside gateway/service-host. |
| `cloud.split-services.production` | Dedicated worker crate/process per plugin family; control via internal HTTP (`/internal/v3/api/customer_services/plugins/...`). |

Pattern mirrors `external/xianyu-auto-reply`: `backend-web` (control) + `websocket` worker (marketplace I/O).

### 4.3 Message pipeline (host-owned)

Inspired by `XianyuAsync.handle_message` callback chain:

```text
1. Plugin ingests raw marketplace frame
2. Plugin adapter -> NormalizedChannelMessage
3. Host dedupe + debounce (configurable per account)
4. Host ticket bridge (create/link conversation -> ticket)
5. Host optional order sync hook (plugin capability)
6. Host auto-delivery pre-check (delivery rule engine)
7. Host auto-reply engine (keyword -> AI -> default)
8. Host notification dispatcher
9. Plugin transport sends outbound reply
10. Host persists audit + channel message log
```

Rules:

- Plugins MUST NOT write ticket tables directly; they emit events/commands to host ports.
- Rule evaluation MUST be separated from side effects (pattern from `delivery_rules/rule_engine.py` + `AutoDeliveryHandler`).

## 5. Plugin package layout

Per `SDKWORK_WORKSPACE_SPEC.md` `plugins/` dictionary:

```text
plugins/
  sdkwork-customerservice-plugin-<plugin_code>/
    sdkwork.plugin.manifest.json       # machine-readable plugin contract
    specs/
      README.md
      component.spec.json
    crates/
      sdkwork-customerservice-plugin-<plugin_code>-runtime/   # optional Rust
    worker/                            # optional Python/Node worker (legacy bridge)
    README.md
```

Naming rules (`NAMING_SPEC.md`):

- Directory: `sdkwork-customerservice-plugin-<plugin_code>`
- `plugin_code`: lowercase kebab-case, registered in `specs/plugin-system.registry.json`
- Display names (闲鱼, 淘宝) are UI/i18n only; never used in table or API identifiers.

## 6. Plugin manifest (`sdkwork.plugin.manifest.json`)

```json
{
  "schemaVersion": 1,
  "kind": "sdkwork.customerservice.plugin",
  "plugin": {
    "code": "goofish",
    "displayName": "Goofish / 闲鱼",
    "version": "0.1.0",
    "runtimeLanguages": ["rust"],
    "capabilities": [
      "session.cookie",
      "transport.websocket",
      "message.chat",
      "message.card",
      "order.sync",
      "delivery.auto",
      "reply.keyword"
    ]
  },
  "entrypoints": {
    "registryFactory": "sdkwork_customerservice_plugin_goofish::register",
    "workerMain": null
  },
  "database": {
    "overlayRegistry": "docs/schema-registry/overlays/goofish.tables.yaml"
  },
  "internalApi": {
    "controlPrefix": "/internal/v3/api/customer_services/plugins/goofish"
  },
  "security": {
    "credentialKinds": ["cookie", "token"],
    "sensitiveFields": ["cookie_value", "access_token"]
  }
}
```

Rules:

- `plugin.code` MUST match `plugin-system.registry.json`.
- Capabilities MUST be declared explicitly; host gates features by capability intersection.
- Credential kinds MUST be listed for encryption and audit policy (L3 tables).

## 7. Host SPI (Rust)

New crate: `crates/sdkwork-communication-customerservice-plugin-spi`.

### 7.1 Core traits

```rust
/// Plugin factory registered at startup.
pub trait ChannelPlugin: Send + Sync {
    fn plugin_code(&self) -> &'static str;
    fn capabilities(&self) -> &[PluginCapability];
    fn create_account_runtime(&self, ctx: AccountRuntimeContext) -> Box<dyn AccountRuntime>;
}

/// One instance per channel account (CookieManager / XianyuAsync granularity).
pub trait AccountRuntime: Send {
    async fn start(&mut self) -> Result<(), PluginError>;
    async fn stop(&mut self) -> Result<(), PluginError>;
    fn connection_state(&self) -> ConnectionState;
}

pub trait SessionProvider: Send + Sync {
    async fn refresh_session(&self) -> Result<CredentialSnapshot, PluginError>;
    async fn handle_auth_challenge(&self, challenge: AuthChallenge) -> Result<(), PluginError>;
}

pub trait MessageTransport: Send + Sync {
    async fn send_text(&self, req: OutboundTextRequest) -> Result<OutboundMessageResult, PluginError>;
    async fn send_media(&self, req: OutboundMediaRequest) -> Result<OutboundMessageResult, PluginError>;
    async fn create_conversation(&self, req: CreateConversationRequest) -> Result<String, PluginError>;
}

pub trait MessageIngestAdapter: Send + Sync {
    fn normalize(&self, raw: &RawChannelFrame) -> Result<NormalizedChannelMessage, PluginError>;
}
```

### 7.2 Host ports (injected into plugins)

```rust
pub trait PluginHostPorts: Send + Sync {
    async fn persist_inbound_message(
        &self,
        ctx: &AccountRuntimeContext,
        msg: NormalizedChannelMessage,
    ) -> Result<Uuid, PluginError>;
    async fn bridge_to_ticket(&self, conversation_id: Uuid) -> Result<Uuid, PluginError>;
    async fn run_auto_reply(
        &self,
        ctx: &AccountRuntimeContext,
        msg: &NormalizedChannelMessage,
    ) -> Result<Option<ReplyContent>, PluginError>;
    async fn run_delivery_pre_check(&self, order_ctx: &OrderContext) -> Result<DeliveryAction, PluginError>;
    async fn emit_notification(&self, event: PluginNotificationEvent) -> Result<(), PluginError>;
}
```

Host implementation: `crates/sdkwork-communication-customerservice-plugin-host` (`ChannelPluginHost`), wired in `sdkwork-customerservice-service-host`.

### 7.3 Rule extension (registry pattern)

Mirrors `delivery_rules/rule_registry.py`:

```rust
pub trait DeliveryRule: Send + Sync {
    fn rule_code(&self) -> &'static str;
    async fn evaluate(&self, ctx: &DeliveryCheckContext) -> RuleCheckResult;
}

pub trait DeliveryRuleRegistry: Send + Sync {
    fn get(&self, rule_code: &str) -> Option<Arc<dyn DeliveryRule>>;
}
```

Host loads enabled rules from `communication_cs_delivery_block_rule`; plugins MAY register additional `DeliveryRule` implementations via manifest `ruleContributions`.

### 7.4 Extension point rules (`MODULE_SPEC.md`)

- All variation MUST go through traits/adapters, not monkey-patching.
- Missing plugin or capability MUST fail with deterministic errors (no silent fallback to another platform).
- Plugins MUST NOT import route crates or construct HTTP clients to host APIs; use injected ports.

## 8. Plugin registry

Machine-readable catalog: `specs/plugin-system.registry.json`.

Host loads:

1. Built-in registry entries (goofish, taobao stubs).
2. Optional dynamic entries from `communication_cs_plugin_catalog` (operator-enabled modules).

Tenant enablement: `communication_cs_plugin_enablement`.

## 9. HTTP API surfaces

All paths under existing prefixes (`AGENTS.md`):

| Surface | Prefix | Purpose | Status |
| --- | --- | --- | --- |
| Backend | `/backend/v3/api/customer_services/tickets` | Ticket admin list/retrieve/update/messages | active |
| Backend | `/backend/v3/api/customer_services/channels/accounts` | List/create/update channel accounts | active |
| Backend | `/backend/v3/api/customer_services/channels/accounts/{accountId}/credentials` | Register channel credentials (cookie) | active |
| Backend | `/backend/v3/api/customer_services/channels/accounts/{accountId}/runtime/start\|stop\|status` | Operator worker control (tenant-scoped) | active |
| Backend | `/backend/v3/api/customer_services/channels/auto_reply_rules` | Auto-reply rule list/create | active |
| Backend | `/backend/v3/api/customer_services/channels/auto_reply_rules/{ruleId}` | Auto-reply rule update/delete | active |
| Backend | `/backend/v3/api/customer_services/channels/delivery_block_rules/catalog` | Delivery block rule metadata catalog | active |
| Backend | `/backend/v3/api/customer_services/channels/accounts/{accountId}/delivery_block_rules` | Delivery block rule list/upsert | active |
| Backend | `/backend/v3/api/customer_services/plugins` | List plugin catalog (tenant enablement merged) | active |
| Backend | `/backend/v3/api/customer_services/plugins/{pluginCode}/enablement` | Upsert tenant plugin enablement | active |
| Backend | `/backend/v3/api/customer_services/channels/...` | Account delete | planned |
| Internal | `/internal/v3/api/customer_services/plugins/{code}/accounts/{accountId}/start\|stop\|status\|send_message` | Worker control (ingress token) | active |
| Internal | `/internal/v3/api/customer_services/plugins/{code}/accounts/{accountId}/delivery_pre_check` | Delivery block pre-check (ingress token) | active |

Operator UI (PC): ticket workbench, channel admin (account update, auto-reply CRUD, delivery block rules, runtime control), Drive attachments. H5 operator mode: ticket workbench and channel admin with full CRUD parity (Tickets / Channels tabs).

Ticket APIs remain unchanged; channel messages link via `ticket_id` on conversations.

OpenAPI authority MUST be added under `apis/backend-api/` before implementation (`API_SPEC.md`).

## 10. Mapping from `external/xianyu-auto-reply`

| Reference module | Host / plugin responsibility |
| --- | --- |
| `CookieManager` | `PluginHost` + `ChannelAccountManager` |
| `XianyuAsync` | `AccountRuntime` (plugin) |
| `MessageHandler` | `MessageIngestAdapter` (plugin) + host dedupe |
| `AutoReplyService` | Host `AutoReplyEngine` (DB-backed rules) |
| `delivery_rules/*` | Host `DeliveryRuleRegistry` + plugin contributions |
| `TokenManager` / `CookieTokenManager` | `SessionProvider` (plugin) |
| `NotificationManager` | Host notification dispatcher |
| `XYAccount`, `XYKeywordRule`, ... | Host DB tables (section 11) |
| `xy_orders`, cards | Plugin overlay tables (`goofish`) |

## 11. Database abstraction

See:

- `database/contract/schema.yaml` (host tables)
- `docs/schema-registry/customerservice.tables.yaml` (portable contracts)
- `database/ddl/migrations/postgres/0002_customerservice_plugin_system.sql`

### 11.1 Table tiers

| Tier | Owner | Prefix | Examples |
| --- | --- | --- | --- |
| Core ticket | Host | `communication_cs_ticket*` | Existing baseline |
| Cross-platform channel | Host | `communication_cs_channel_*`, `communication_cs_plugin_*` | Accounts, conversations, messages |
| Policy | Host | `communication_cs_auto_reply_*`, `communication_cs_delivery_*` | Rules engine config |
| Platform overlay | Plugin | `communication_cs_plugin_<code>_` | Goofish orders, cards |

### 11.2 Key design rules (`DATABASE_SPEC.md` L2)

- All tenant data MUST include `tenant_id`; channel accounts SHOULD include `organization_id`.
- External identifiers (`external_message_id`, `external_conversation_id`) MUST be query columns, not JSON-only.
- Inbound messages MUST have idempotency via `(tenant_id, account_id, external_message_id)` unique index.
- Credentials MUST live in `communication_cs_channel_account_credential` (L3); never in ticket/message tables.
- `communication_cs_ticket.channel` MUST equal `plugin_code` for plugin-origin tickets.
- Plugin overlay DDL MUST register through manifest `database.overlayRegistry` and schema registry composition (`SCHEMA_REGISTRY_SPEC.md`).

### 11.3 Ticket bridge

```text
communication_cs_channel_conversation.ticket_id -> communication_cs_ticket.id
communication_cs_channel_message -> optional mirror in communication_cs_ticket_message
```

Bridge policy:

- First inbound message creates ticket with `channel = plugin_code`.
- Subsequent messages append to linked ticket.
- Operator manual tickets (`channel = web`) MAY later link to channel conversation.

## 12. Security

Per `SECURITY_SPEC.md`:

- Credentials encrypted at rest; access only through host credential service.
- Internal control API authenticated via service identity (standalone: loopback; cloud: mTLS/JWT).
- Plugin workers MUST NOT expose marketplace credentials to browser clients.
- Audit: `communication_cs_plugin_event_log` for session refresh, delivery block, send failures.

## 13. Verification

```bash
pnpm db:validate
pnpm plugin:validate
pnpm verify
```

## 14. Implementation phases

| Phase | Deliverable |
| --- | --- |
| P0 | Spec, ADR, DB contract + migration, registry stubs, SPI crate skeleton |
| P1 | Host `ChannelPluginHost`, plugin/channel list backend APIs, `pnpm plugin:validate` |
| P2 | Port xianyu-auto-reply worker behind goofish plugin adapter |
| P3 | Taobao plugin skeleton + overlay tables |
| P4 | Split worker topology for cloud profile |

## 15. References

- `external/xianyu-auto-reply/websocket/app/services/xianyu/`
- `docs/architecture/decisions/ADR-20250627-customerservice-channel-plugin-system.md`
- `specs/plugin-system.registry.json`
