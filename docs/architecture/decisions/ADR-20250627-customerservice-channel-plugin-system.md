# ADR-20250627-customerservice-channel-plugin-system

Status: accepted
Owner: customerservice-platform
Date: 2025-06-27
Specs: ARCHITECTURE_DECISION_SPEC.md, PLUGIN_SYSTEM_SPEC.md, DATABASE_SPEC.md, SDKWORK_WORKSPACE_SPEC.md, MODULE_SPEC.md

## Context

Customer service must support multiple marketplace channels (闲鱼/Goofish, 淘宝/Taobao, etc.) without embedding platform protocols in core ticket logic. The repository includes `external/xianyu-auto-reply`, a mature Python implementation with:

- Per-account runtime (`CookieManager` + `XianyuAsync`)
- Marketplace WebSocket transport separate from admin UI WebSocket
- Registry-based delivery rules (`delivery_rules/rule_registry.py`)
- Host DB models for accounts, keyword rules, delivery block rules, orders

Current customerservice core supports ticket lifecycle with a `channel` field (default `web`). Host plugin tables, SPI traits, `ChannelPluginHost`, backend channel/admin APIs, internal worker control APIs, and the Goofish runtime capability crate are implemented for launch. Live marketplace WebSocket workers remain **planned** per PRD non-goals until post-launch adapters land.

## Decision

Adopt a **host + channel plugin** architecture:

1. **Host** owns ticket lifecycle, cross-platform channel tables, auto-reply/delivery policy stores, plugin registry, and ticket bridge.
2. **Plugins** under `plugins/sdkwork-customerservice-plugin-<code>/` implement marketplace session, transport, and message normalization via Rust SPI traits (`sdkwork-communication-customerservice-plugin-spi`).
3. **Database** splits into host L2 tables (`communication_cs_channel_*`, `communication_cs_plugin_*`) and plugin overlay tables (`communication_cs_plugin_<code>_*`) composed through schema registry overlays.
4. **Control/data plane split**: HTTP backend APIs for CRUD; optional worker process for long-lived marketplace connections (mirroring xianyu `backend-web` + `websocket`).
5. **Migration path**: Goofish plugin wraps/adapts `external/xianyu-auto-reply` before native Rust reimplementation.

## Alternatives

| Alternative | Rejected because |
| --- | --- |
| Single monolithic Python service | Violates SDKWork Rust HTTP runtime standard; poor tenant isolation story in core repo. |
| Platform logic only in `channel` string + handlers in core | Does not scale to Taobao and future platforms; core becomes unmaintainable. |
| Full microservice per platform from day one | Premature without RPC/discovery; PRD defers gRPC split. |
| Copy xianyu DB schema verbatim (`xy_*`) | Breaks `communication_` prefix, tenant model, and portable contract rules. |

## Consequences

### Positive

- Clear extension boundary aligned with `MODULE_SPEC.md` extension points.
- xianyu patterns (rule registry, account runtime, ingest callbacks) map directly to SPI traits.
- Ticket API remains stable; marketplace features additive via backend channel APIs.

### Negative

- Additional tables and migration complexity.
- Phase 2 post-launch requires production Goofish WebSocket worker or Python bridge hardening behind internal control APIs.

### Follow-up

- **Launch (done):** channel account CRUD, internal worker control APIs, plugin enablement, delivery rule evaluation, PC/H5 operator admin.
- **Post-launch:** port live Goofish WebSocket worker behind `ChannelPluginHost` ports; buyer_credit external API; auto-delivery execution.

## Verification

- `pnpm db:validate` passes with new contract tables.
- `pnpm plugin:validate` passes against manifest stubs and host wiring.
- `TECH_ARCHITECTURE.md` links this ADR and plugin layering.

## Supersedes / Superseded By

None.
