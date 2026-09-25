# PROMueve Nexus — Platform Context API (F3.1)

**Status:** `ACCEPTED_ENGINEERING_CONTRACT`
**Issue / WO:** #398 — `WO-NEXUS-F3.1` (WU-A `ConfigurationRepository`, WU-B `PlatformContext`)
**ADRs:** [ADR-002](../architecture/adr/ADR-002-modular-monolith-and-module-boundaries.md) (module boundaries; no clinical data on the platform seam), [ADR-003](../architecture/adr/ADR-003-hospital-deployment-and-configuration.md) (explicit failure on unknown/incoherent configuration)

## Purpose

The platform seam is the small, read-only boundary between the fixed site
deployment and the future F3.2 Home shell. It answers two questions only:
*what is deployed here* and *what is technically reachable*. It transports no
clinical data: Home is shell/navigation, never a Data Plane. All deployment
truth is produced once by `ConfigurationRepository.load` and frozen; the
facade only queries that snapshot.

Both modules are dual browser/Node classic scripts (no import/export, no
framework), attached to the `PromuevePlatform` namespace only. They never
touch the clinical `HubTools` namespace.

## ConfigurationRepository.load (WU-A)

```js
var snapshot = PromuevePlatform.ConfigurationRepository.load({
  registry, profile, manifest, readiness, schemaValidators,
});
```

Loads and validates the four packaged artifacts (registry, profile, manifest,
readiness) with the injected schema validators, cross-checks them, and
returns a deep-frozen `EffectiveDeployment` snapshot. Any invalid input
throws `PlatformConfigurationError` with a stable `code`.

## EffectiveDeployment snapshot shape

| Field | Type | Notes |
| --- | --- | --- |
| `snapshotVersion` | `'1'` | Only version accepted by the facade |
| `deploymentId` | `string` | Fixed per artifact set |
| `siteId` | `string` | Fixed per artifact set |
| `persistenceMode` | `string` | From the deployment profile |
| `display` | `object` | Technical branding (frozen) |
| `provenance` | `object` | Artifact provenance (frozen) |
| `modules` | `array` | Module descriptors in manifest order (frozen) |

Each module descriptor carries `moduleId`, `label`, `route`, `enabled`,
`qualificationState`, `available`, `platformCapabilities`, `readiness`,
`release`. `available === true` only when the module is enabled **and**
`QUALIFIED_FOR_SITE`. Every object and array in the snapshot is frozen; the
snapshot is the single authority and is never reconstructed or sanitized.

## PlatformContext.fromSnapshot (WU-B)

```js
var context = PromuevePlatform.PlatformContext.fromSnapshot(snapshot);
```

The only entry point. `snapshot` must be a frozen EffectiveDeployment issued
by `ConfigurationRepository.load` in the same namespace: since F3.1-E the
facade verifies snapshot origin, so a frozen structurally-identical lookalike
fabricated elsewhere throws `PlatformContextError` with code
`SNAPSHOT_UNTRUSTED_ORIGIN`, while a non-conforming object throws
`SNAPSHOT_INVALID`. The returned facade is a
frozen object exposing only read-only queries; it holds no state, no events
and no caching beyond the closed-over snapshot.

| Method | Returns / behavior |
| --- | --- |
| `getDeploymentId()` | Deployment id from the snapshot |
| `getSiteId()` | Site id from the snapshot |
| `getPersistenceMode()` | Persistence mode from the snapshot |
| `getBranding()` | The snapshot's technical `display` object |
| `getProvenance()` | The snapshot's `provenance` object |
| `getModules()` | All module descriptors, in snapshot order (frozen array; includes unavailable modules) |
| `getModule(moduleId)` | One descriptor; unknown id throws `MODULE_UNKNOWN` |
| `isModuleAvailable(moduleId)` | `true` only when `available === true`; unknown id throws `MODULE_UNKNOWN` (never a silent `false`) |
| `getNavigableModules()` | Descriptors with `available === true` only, in snapshot order |
| `getModuleRoute(moduleId)` | Route string for an available module; unknown id throws `MODULE_UNKNOWN`, known-but-unavailable throws `MODULE_NOT_AVAILABLE` |
| `getModuleReadiness(moduleId)` | Readiness value for any registered module (technical information, not navigation); unknown id throws `MODULE_UNKNOWN` |

## Error codes

`PlatformConfigurationError` (WU-A) and `PlatformContextError` (WU-B) carry a
stable `code` and fail closed; nothing is guessed or silently defaulted.

| Namespace | Code | Meaning |
| --- | --- | --- |
| CONFIGURATION | `CONFIG_INPUT_INVALID` | Missing/invalid load input or artifact |
| CONFIGURATION | `SCHEMA_VALIDATOR_REQUIRED` | Missing validator for an artifact |
| CONFIGURATION | `REGISTRY_SCHEMA_INVALID` / `PROFILE_SCHEMA_INVALID` / `MANIFEST_SCHEMA_INVALID` / `READINESS_SCHEMA_INVALID` | Artifact failed its JSON Schema |
| CONFIGURATION | `REGISTRY_DUPLICATE_MODULE` | Duplicate moduleId in the registry |
| CONFIGURATION | `PROFILE_UNKNOWN_MODULE` | Profile module not in the registry |
| CONFIGURATION | `PROFILE_INCOHERENT_ENABLED` | `enabled` contradicts `qualificationState` |
| CONFIGURATION | `PROFILE_QUALIFICATION_EVIDENCE_REQUIRED` | `QUALIFIED_FOR_SITE` without evidence |
| CONFIGURATION | `MANIFEST_DUPLICATE_MODULE` / `MANIFEST_MODULE_NOT_IN_PROFILE` / `MANIFEST_MISSING_MODULE` / `MANIFEST_AVAILABLE_CONTRADICTION` | Manifest vs profile incoherence |
| CONFIGURATION | `MANIFEST_PROFILE_ENABLED_MISMATCH` | Manifest `enabled` differs from the profile's; the manifest cannot enable a module the profile disabled |
| CONFIGURATION | `MANIFEST_PROFILE_QUALIFICATION_MISMATCH` | Manifest `qualificationState` differs from the profile's; the manifest cannot elevate qualification |
| CONFIGURATION | `MANIFEST_PROFILE_DEPLOYMENT_ID_MISMATCH` | Manifest `deploymentId` differs from the profile's |
| CONFIGURATION | `MANIFEST_PROFILE_SITE_ID_MISMATCH` | Manifest `siteId` differs from the profile's |
| CONFIGURATION | `MANIFEST_PROFILE_PERSISTENCE_MODE_MISMATCH` | Manifest `persistenceMode` differs from the profile's |
| CONFIGURATION | `MANIFEST_REGISTRY_MODULE_UNKNOWN` | Manifest moduleId is not registered in the module registry |
| CONFIGURATION | `MANIFEST_REGISTRY_LABEL_MISMATCH` | Manifest `label` differs from the registry entry |
| CONFIGURATION | `MANIFEST_REGISTRY_ENTRY_PATH_MISMATCH` | Manifest `entryPath` differs from the registry entry |
| CONFIGURATION | `MANIFEST_REGISTRY_CAPABILITIES_MISMATCH` | Manifest `platformCapabilities` differ from the registry entry |
| CONFIGURATION | `READINESS_DEPLOYMENT_ID_MISMATCH` | Readiness `deploymentId` differs from the manifest's |
| CONFIGURATION | `READINESS_SITE_ID_MISMATCH` | Readiness `siteId` differs from the manifest's |
| CONFIGURATION | `READINESS_UNKNOWN_MODULE` / `READINESS_MISSING_MODULE` / `READINESS_AVAILABLE_CONTRADICTION` / `READINESS_ROUTE_MISMATCH` / `READINESS_QUALIFICATION_STATE_MISMATCH` | Readiness vs manifest incoherence |
| CONFIGURATION | `MANIFEST_PROFILE_DISPLAY_MISMATCH` | Manifest `display` differs from the profile's; the profile is the display authority |
| CONFIGURATION | `PROFILE_DUPLICATE_MODULE` | Duplicate moduleId in the deployment profile |
| CONFIGURATION | `READINESS_DUPLICATE_MODULE` | Duplicate moduleId in readiness (rejected before per-module resolution) |
| CONFIGURATION | `READINESS_LABEL_MISMATCH` | Readiness `label` differs from the manifest/registry entry |
| CONFIGURATION | `READINESS_CAPABILITIES_MISMATCH` | Readiness `platformCapabilities` differ from the manifest entry (compared as a set) |
| CONFIGURATION | `REGISTRY_UNSAFE_ENTRY_PATH` | Registry `entryPath` is not a safe relative `.html` path |
| CONFIGURATION | `REGISTRY_DUPLICATE_ENTRY_PATH` | Two registry modules share the same `entryPath` |
| CONFIGURATION | `MANIFEST_MODULE_ORDER_MISMATCH` | Manifest module order differs from the canonical registry order |
| CONFIGURATION | `CONFIG_INPUT_UNKNOWN_KEY` | Unknown top-level key in the `load` input |
| CONTEXT | `SNAPSHOT_INVALID` | Input is not the frozen `snapshotVersion '1'` snapshot (shape check runs before the origin check) |
| CONTEXT | `SNAPSHOT_UNTRUSTED_ORIGIN` | Well-formed frozen snapshot that `ConfigurationRepository.load` did not issue in this namespace |
| CONTEXT | `MODULE_UNKNOWN` | moduleId is not part of the snapshot |
| CONTEXT | `MODULE_NOT_AVAILABLE` | Module registered but not available (e.g. route requested) |

## Registered vs navigable

Unqualified (`IMPLEMENTED_NOT_QUALIFIED`) and disabled modules stay visible
as registered descriptors via `getModules`/`getModule` with
`available === false`, but they are never navigable: `getNavigableModules`
excludes them and `getModuleRoute` fails explicitly for them. Readiness stays
queryable for them because it is technical status, not navigation.

## Cross-artifact authority invariant (#398-C)

The manifest transports availability but never decides it. `load` fails closed, in a fixed
deterministic order with no fallback and no auto-repair, when: the manifest's `deploymentId`,
`siteId` or `persistenceMode` diverge from the profile; a manifest module's `enabled` or
`qualificationState` diverge from the profile (so qualification elevation by the manifest is
impossible, together with `MANIFEST_AVAILABLE_CONTRADICTION`); a manifest module is absent from
the registry or its technical identity (label, entryPath, platformCapabilities) diverges from the
registry; or the readiness `deploymentId`/`siteId` diverge from the manifest. First mismatch wins;
the snapshot is only built when every artifact agrees.

## Display, order and route authority (#398 F3.1-D)

`display` is profile-authorized: the snapshot takes it from the profile and the manifest must
carry it verbatim (`MANIFEST_PROFILE_DISPLAY_MISMATCH`). Module order is registry-authorized:
the manifest lists the profile-selected modules in registry order
(`MANIFEST_MODULE_ORDER_MISMATCH`); profile order only selects which modules deploy. Route
safety is registry-authorized: every registry `entryPath` must be a safe relative `.html` path
(`REGISTRY_UNSAFE_ENTRY_PATH`, unique per registry). `provenance` is diagnostic evidence only,
never runtime authorization. Capability equality is set semantics everywhere; array order is
never authority. The `load` input is closed: unknown top-level keys fail with
`CONFIG_INPUT_UNKNOWN_KEY`.

## Snapshot trust boundary (#398 F3.1-E, NEXUS-DEBT-006)

`PlatformContext.fromSnapshot` consumes only EffectiveDeployment snapshots
issued by `ConfigurationRepository.load`. The repository registers every
snapshot it issues, as the last step of a successful `load`, in an internal
**non-enumerable** issuance registry (a `WeakSet` attached to the shared
`PromuevePlatform` namespace; not documented public API). The facade verifies
that origin after the shape check, in this fixed order:

1. Presence/shape first: non-objects and malformed snapshots fail with
   `SNAPSHOT_INVALID`.
2. Origin second: a well-formed frozen lookalike that satisfies the shape but
   was never issued by the repository fails with `SNAPSHOT_UNTRUSTED_ORIGIN`.
   If the registry is absent or unusable (e.g. the context module loaded
   without the repository in the same namespace), no snapshot is trusted.

Isolation contract: the issued snapshot is a deep copy of the load input;
mutating the SAME original input objects passed to `load()` — after `load`
has returned — never alters the snapshot.

This is an honest-origin contract between the two platform modules
(ADR-002/003 fail-closed), **not** a security boundary: a hostile
same-origin script can read the shared namespace or replay a legitimately
issued snapshot.

## Non-goals

- No patient/dataset transport of any kind (ADR-002): no identifiers, no
  workbooks, no cohorts, no clinical keys anywhere on this seam.
- No remote or runtime-mutable configuration; no hospital selector; no
  per-session reconfiguration.
- No auth, roles or permissions; no clinical interpretation or rules.
- No navigation execution: the facade returns route strings; rendering and
  routing belong to the F3.2 Home shell.

Contract verification: `node tools/platform_contract_check.mjs` (33 original WU-A/WU-B
cases + 13 cross-artifact authority hardening cases from #398-C + 20 F3.1-D invariant closure
cases + 5 F3.1-E trust-boundary/isolation cases, all synthetic).
