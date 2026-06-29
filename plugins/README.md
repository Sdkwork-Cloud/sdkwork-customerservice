# Channel plugins

Runtime marketplace channel plugins for SDKWork Customer Service.

Canonical spec: [`../specs/PLUGIN_SYSTEM_SPEC.md`](../specs/PLUGIN_SYSTEM_SPEC.md)

Registry: [`../specs/plugin-system.registry.json`](../specs/plugin-system.registry.json)

## Layout

```text
plugins/
  sdkwork-customerservice-plugin-<plugin_code>/
    sdkwork.plugin.manifest.json
    specs/component.spec.json
    README.md
    crates/ ...          # optional Rust runtime
    docs/schema-registry/overlays/<plugin_code>.tables.yaml
```

## Registered plugins

| Code | Display | Status | Reference |
| --- | --- | --- | --- |
| `goofish` | 闲鱼 / Goofish | planned | `external/xianyu-auto-reply` |
| `taobao` | 淘宝 / Taobao | planned | — |

## Host integration

- SPI crate: `crates/sdkwork-communication-customerservice-plugin-spi`
- Host tables: `communication_cs_channel_*`, `communication_cs_plugin_*` (see `database/contract/schema.yaml`)
- ADR: `docs/architecture/decisions/ADR-20250627-customerservice-channel-plugin-system.md`

Agent/Cursor plugins live under `.sdkwork/plugins/` — not here.
