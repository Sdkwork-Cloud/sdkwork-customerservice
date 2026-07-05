# scripts

Repository automation scripts.

| Script | Purpose |
| --- | --- |
| `prepare-ci-dependencies.mjs` | Materializes sibling SDKWork repositories declared in `sdkwork.workflow.json` for CI and isolated verify parity |
| `gateway/assembly-materialize.mjs` | Gateway composition materialization |
| `gateway/assembly-validate.mjs` | Gateway composition validation |

CI and release packaging call `pnpm run workflow:prepare-ci-dependencies` before `pnpm install` so path-federated siblings (`../sdkwork-database`, `../sdkwork-specs`, `../sdkwork-iam`, etc.) exist on clean GitHub checkouts.

See `../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md` and `../sdkwork-specs/GITHUB_WORKFLOW_SPEC.md`.
