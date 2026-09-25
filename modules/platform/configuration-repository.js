/**
 * PROMueve Nexus platform seam — ConfigurationRepository (F3.1 WU-A).
 *
 * Small load/validate/freeze function over already-parsed packaged artifacts.
 * It is NOT a service or framework: no remote/mutable configuration, no
 * hospital selector, no runtime reconfiguration. One site/deployment is fixed
 * per artifact set; anything unknown or incoherent fails closed.
 *
 * ADR-002 boundary: this seam transports NO clinical data — no patient
 * identifiers, no workbooks, no cohorts, no clinical rules. Any clinical key
 * reaching these artifacts is a configuration error, not a feature.
 *
 * Dual browser/Node classic script (no import/export, no framework). Attaches
 * to the platform namespace only; it never touches the clinical HubTools
 * namespace.
 *
 * Usage (browser or Node sandbox):
 *   var deployment = PromuevePlatform.ConfigurationRepository.load({
 *     registry, profile, manifest, readiness, schemaValidators
 *   });
 * `schemaValidators` maps artifact name ('registry' | 'profile' | 'manifest'
 * | 'readiness') to a function(doc) returning an array of error strings
 * (empty array = valid). A missing validator is an explicit failure, never a
 * silent skip.
 */

var root = typeof window !== 'undefined' ? window : globalThis;
root.PromuevePlatform = root.PromuevePlatform || {};

(function (exports) {
  'use strict';

  var ARTIFACT_NAMES = ['registry', 'profile', 'manifest', 'readiness'];

  var ENABLED_STATES = ['IMPLEMENTED_NOT_QUALIFIED', 'QUALIFIED_FOR_SITE'];
  var DISABLED_STATES = ['NOT_IMPLEMENTED', 'DISABLED_BY_DEPLOYMENT'];

  function PlatformConfigurationError(code, message) {
    Error.call(this, message);
    this.name = 'PlatformConfigurationError';
    this.code = code;
    this.message = message;
  }
  PlatformConfigurationError.prototype = Object.create(Error.prototype);
  PlatformConfigurationError.prototype.constructor = PlatformConfigurationError;
  exports.PlatformConfigurationError = PlatformConfigurationError;

  function fail(code, message) {
    throw new PlatformConfigurationError(code, message);
  }

  // Trust boundary between the repository and PlatformContext (#398 F3.1-E,
  // NEXUS-DEBT-006): every EffectiveDeployment snapshot successfully issued
  // by load() is registered here, and PlatformContext.fromSnapshot consumes
  // only snapshots present in this registry. This is an honest-origin
  // contract between the two platform modules (ADR-002/003 fail-closed),
  // NOT a security boundary: a hostile same-origin script could read the
  // registry reference or replay a legitimately issued snapshot.
  var ISSUED_SNAPSHOTS = new WeakSet();

  function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function deepCopy(value) {
    if (Array.isArray(value)) return value.map(deepCopy);
    if (isPlainObject(value)) {
      var copy = {};
      for (var key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) copy[key] = deepCopy(value[key]);
      }
      return copy;
    }
    return value;
  }

  function deepFreeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.freeze(value);
      Object.keys(value).forEach(function (key) {
        deepFreeze(value[key]);
      });
    }
    return value;
  }

  function contains(arr, list) {
    return list.indexOf(arr) !== -1;
  }

  // Full deep equality (objects compared by own enumerable keys, arrays
  // element-wise) used for authority coherence checks.
  function deepEqual(a, b) {
    if (a === b) return true;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (var i = 0; i < a.length; i++) {
        if (!deepEqual(a[i], b[i])) return false;
      }
      return true;
    }
    if (isPlainObject(a) && isPlainObject(b)) {
      var aKeys = Object.keys(a);
      if (aKeys.length !== Object.keys(b).length) return false;
      for (var j = 0; j < aKeys.length; j++) {
        var key = aKeys[j];
        if (!Object.prototype.hasOwnProperty.call(b, key) || !deepEqual(a[key], b[key])) return false;
      }
      return true;
    }
    return false;
  }

  // Order-insensitive array-set comparison. Artifact schemas enforce
  // uniqueItems on capability arrays, so element membership plus equal length
  // is a faithful set comparison here.
  function sameSet(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (b.indexOf(a[i]) === -1) return false;
    }
    return true;
  }

  // Safe relative .html route (#398 F3.1-D): non-empty string, starts with a
  // lowercase letter or digit (which also rejects a leading slash), no
  // protocol separator ("://"), no backslash separator, no '?' query or '#'
  // fragment, no '.' or '..' path segment, ends with '.html'.
  function isSafeRelativeHtmlPath(entryPath) {
    if (typeof entryPath !== 'string' || entryPath.length === 0) return false;
    if (!/^[a-z0-9]/.test(entryPath)) return false;
    if (entryPath.indexOf('://') !== -1) return false;
    if (entryPath.indexOf('\\') !== -1) return false;
    if (entryPath.indexOf('?') !== -1 || entryPath.indexOf('#') !== -1) return false;
    var segments = entryPath.split('/');
    for (var i = 0; i < segments.length; i++) {
      if (segments[i] === '.' || segments[i] === '..') return false;
    }
    return entryPath.slice(-5) === '.html';
  }

  // --- step 1: input presence/shape (fail closed, no defaults) ---

  function validateInputShape(input, schemaValidators) {
    if (!isPlainObject(input)) fail('CONFIG_INPUT_INVALID', 'ConfigurationRepository.load requires an input object');
    for (var i = 0; i < ARTIFACT_NAMES.length; i++) {
      var name = ARTIFACT_NAMES[i];
      if (!isPlainObject(input[name])) {
        fail('CONFIG_INPUT_INVALID', 'missing or invalid packaged artifact: "' + name + '"');
      }
    }
    if (!isPlainObject(schemaValidators)) {
      fail('CONFIG_INPUT_INVALID', 'missing or invalid "schemaValidators" map');
    }
    for (var j = 0; j < ARTIFACT_NAMES.length; j++) {
      var artifact = ARTIFACT_NAMES[j];
      if (typeof schemaValidators[artifact] !== 'function') {
        fail('SCHEMA_VALIDATOR_REQUIRED', 'missing schema validator for artifact "' + artifact + '"');
      }
    }
    // Snapshot-identity fields must exist explicitly; they are never guessed.
    if (typeof input.profile.deploymentId !== 'string' || typeof input.profile.siteId !== 'string' ||
        typeof input.profile.persistenceMode !== 'string') {
      fail('CONFIG_INPUT_INVALID', 'profile is missing deploymentId, siteId or persistenceMode');
    }
    if (!isPlainObject(input.manifest.display) || !isPlainObject(input.manifest.provenance)) {
      fail('CONFIG_INPUT_INVALID', 'manifest is missing display or provenance');
    }
    // Closed load input (#398 F3.1-D): exactly these top-level keys, nothing
    // else. Unknown keys fail closed instead of being ignored.
    var allowedInputKeys = ['registry', 'profile', 'manifest', 'readiness', 'schemaValidators'];
    for (var inputKey in input) {
      if (Object.prototype.hasOwnProperty.call(input, inputKey) && allowedInputKeys.indexOf(inputKey) === -1) {
        fail('CONFIG_INPUT_UNKNOWN_KEY', 'unknown top-level load input key: "' + inputKey + '"');
      }
    }
  }

  // --- step 2: schema validation through the injected validators ---

  var SCHEMA_ERROR_CODES = {
    registry: 'REGISTRY_SCHEMA_INVALID',
    profile: 'PROFILE_SCHEMA_INVALID',
    manifest: 'MANIFEST_SCHEMA_INVALID',
    readiness: 'READINESS_SCHEMA_INVALID',
  };

  function validateSchemas(input, schemaValidators) {
    for (var i = 0; i < ARTIFACT_NAMES.length; i++) {
      var name = ARTIFACT_NAMES[i];
      var errors = schemaValidators[name](input[name]);
      if (!Array.isArray(errors) || errors.length > 0) {
        var detail = Array.isArray(errors) ? errors.join('; ') : 'validator returned a non-array result';
        fail(SCHEMA_ERROR_CODES[name], name + ' artifact failed schema validation: ' + detail);
      }
    }
  }

  // --- step 3: registry semantics ---

  function validateRegistrySemantics(registry) {
    // Prototype-safe maps (#398 F3.1-D): inherited keys such as 'constructor'
    // can never satisfy a moduleId or entryPath lookup.
    var seen = Object.create(null);
    var entryPaths = Object.create(null);
    for (var i = 0; i < registry.modules.length; i++) {
      var moduleId = registry.modules[i].moduleId;
      if (seen[moduleId]) {
        fail('REGISTRY_DUPLICATE_MODULE', 'duplicate moduleId in registry: "' + moduleId + '"');
      }
      seen[moduleId] = true;
      // Route safety is a registry authority property: the registry entryPath
      // is the only route source, so an unsafe path is rejected here, before
      // any manifest/readiness comparison can trust it.
      var entryPath = registry.modules[i].entryPath;
      if (!isSafeRelativeHtmlPath(entryPath)) {
        fail('REGISTRY_UNSAFE_ENTRY_PATH', 'module "' + moduleId + '": registry entryPath "' + entryPath + '" is not a safe relative .html path');
      }
      if (entryPaths[entryPath]) {
        fail('REGISTRY_DUPLICATE_ENTRY_PATH', 'duplicate entryPath in registry: "' + entryPath + '"');
      }
      entryPaths[entryPath] = true;
    }
  }

  // --- step 4: profile semantics ---

  function validateProfileSemantics(profile, registry) {
    var registered = Object.create(null);
    for (var r = 0; r < registry.modules.length; r++) registered[registry.modules[r].moduleId] = true;
    var seen = Object.create(null);
    for (var i = 0; i < profile.modules.length; i++) {
      var mod = profile.modules[i];
      if (seen[mod.moduleId]) {
        fail('PROFILE_DUPLICATE_MODULE', 'duplicate moduleId in profile: "' + mod.moduleId + '"');
      }
      seen[mod.moduleId] = true;
      if (!registered[mod.moduleId]) {
        fail('PROFILE_UNKNOWN_MODULE', 'profile module "' + mod.moduleId + '" is not registered in the module registry');
      }
      if (mod.enabled === true && !contains(mod.qualificationState, ENABLED_STATES)) {
        fail('PROFILE_INCOHERENT_ENABLED', 'module "' + mod.moduleId + '": enabled=true is incoherent with qualificationState="' + mod.qualificationState + '"');
      }
      if (mod.enabled === false && !contains(mod.qualificationState, DISABLED_STATES)) {
        fail('PROFILE_INCOHERENT_ENABLED', 'module "' + mod.moduleId + '": enabled=false is incoherent with qualificationState="' + mod.qualificationState + '"');
      }
      if (mod.qualificationState === 'QUALIFIED_FOR_SITE') {
        var evidence = typeof mod.qualificationEvidence === 'string' ? mod.qualificationEvidence.trim() : '';
        if (evidence.length < 4) {
          fail('PROFILE_QUALIFICATION_EVIDENCE_REQUIRED', 'module "' + mod.moduleId + '": QUALIFIED_FOR_SITE requires non-trivial qualificationEvidence');
        }
      }
    }
  }

  // --- step 5: manifest completeness vs profile and registry ---
  //
  // Cross-artifact authority hardening (#398-C): the manifest transports
  // availability but never decides it; it cannot elevate a module the
  // profile did not enable/qualify. Fail closed, no fallback, first
  // mismatch wins, in this fixed order:
  //   1. once, before the module loops: manifest<->profile identity
  //      (deploymentId, siteId, persistenceMode);
  //   2. per manifest module: duplicate id, registry lookup, registry
  //      label/entryPath/platformCapabilities identity, profile resolution,
  //      available coherence, enabled equality, qualificationState equality;
  //   3. profile coverage (every profile module present in the manifest).

  function validateManifestCompleteness(manifest, profile, registry) {
    if (manifest.deploymentId !== profile.deploymentId) {
      fail('MANIFEST_PROFILE_DEPLOYMENT_ID_MISMATCH', 'manifest deploymentId "' + manifest.deploymentId + '" does not match profile deploymentId "' + profile.deploymentId + '"');
    }
    if (manifest.siteId !== profile.siteId) {
      fail('MANIFEST_PROFILE_SITE_ID_MISMATCH', 'manifest siteId "' + manifest.siteId + '" does not match profile siteId "' + profile.siteId + '"');
    }
    if (manifest.persistenceMode !== profile.persistenceMode) {
      fail('MANIFEST_PROFILE_PERSISTENCE_MODE_MISMATCH', 'manifest persistenceMode "' + manifest.persistenceMode + '" does not match profile persistenceMode "' + profile.persistenceMode + '"');
    }
    // Display coherence (#398 F3.1-D): the profile is the display authority;
    // the manifest must carry it verbatim (full deep compare).
    if (!deepEqual(manifest.display, profile.display)) {
      fail('MANIFEST_PROFILE_DISPLAY_MISMATCH', 'manifest display does not match the profile display; the profile is the display authority');
    }
    var registryById = Object.create(null);
    for (var r = 0; r < registry.modules.length; r++) {
      registryById[registry.modules[r].moduleId] = registry.modules[r];
    }
    var profileById = Object.create(null);
    for (var p = 0; p < profile.modules.length; p++) {
      profileById[profile.modules[p].moduleId] = profile.modules[p];
    }
    var manifestIds = Object.create(null);
    for (var i = 0; i < manifest.modules.length; i++) {
      var mod = manifest.modules[i];
      if (manifestIds[mod.moduleId]) {
        fail('MANIFEST_DUPLICATE_MODULE', 'duplicate moduleId in manifest: "' + mod.moduleId + '"');
      }
      manifestIds[mod.moduleId] = true;
      var registryEntry = registryById[mod.moduleId];
      if (!registryEntry) {
        fail('MANIFEST_REGISTRY_MODULE_UNKNOWN', 'manifest module "' + mod.moduleId + '" is not registered in the module registry');
      }
      if (mod.label !== registryEntry.label) {
        fail('MANIFEST_REGISTRY_LABEL_MISMATCH', 'module "' + mod.moduleId + '": manifest label "' + mod.label + '" does not match registry label "' + registryEntry.label + '"');
      }
      if (mod.entryPath !== registryEntry.entryPath) {
        fail('MANIFEST_REGISTRY_ENTRY_PATH_MISMATCH', 'module "' + mod.moduleId + '": manifest entryPath "' + mod.entryPath + '" does not match registry entryPath "' + registryEntry.entryPath + '"');
      }
      // Set equality (order-insensitive): capability content is authority,
      // not the serialized array order (#398 F3.1-D).
      if (!sameSet(mod.platformCapabilities, registryEntry.platformCapabilities)) {
        fail('MANIFEST_REGISTRY_CAPABILITIES_MISMATCH', 'module "' + mod.moduleId + '": manifest platformCapabilities do not match the registry entry');
      }
      var profileModule = profileById[mod.moduleId];
      if (!profileModule) {
        fail('MANIFEST_MODULE_NOT_IN_PROFILE', 'manifest module "' + mod.moduleId + '" is not resolved by the deployment profile');
      }
      var expectedAvailable = mod.enabled === true && mod.qualificationState === 'QUALIFIED_FOR_SITE';
      if (mod.available !== expectedAvailable) {
        fail('MANIFEST_AVAILABLE_CONTRADICTION', 'module "' + mod.moduleId + '": available=' + mod.available + ' contradicts enabled=' + mod.enabled + ' and qualificationState="' + mod.qualificationState + '"');
      }
      if (mod.enabled !== profileModule.enabled) {
        fail('MANIFEST_PROFILE_ENABLED_MISMATCH', 'module "' + mod.moduleId + '": manifest enabled=' + mod.enabled + ' does not match profile enabled=' + profileModule.enabled + '; the manifest cannot enable a module the profile disabled');
      }
      if (mod.qualificationState !== profileModule.qualificationState) {
        fail('MANIFEST_PROFILE_QUALIFICATION_MISMATCH', 'module "' + mod.moduleId + '": manifest qualificationState "' + mod.qualificationState + '" does not match profile qualificationState "' + profileModule.qualificationState + '"; the manifest cannot elevate qualification');
      }
    }
    for (var q = 0; q < profile.modules.length; q++) {
      var profileModuleId = profile.modules[q].moduleId;
      if (!manifestIds[profileModuleId]) {
        fail('MANIFEST_MISSING_MODULE', 'manifest is missing module "' + profileModuleId + '" resolved by the deployment profile');
      }
    }
    // Canonical order (#398 F3.1-D), checked after set equality: the manifest
    // moduleId sequence must equal the registry order filtered to the
    // profile-selected modules. Profile order is never display/navigation
    // authority.
    var selected = Object.create(null);
    for (var s = 0; s < profile.modules.length; s++) selected[profile.modules[s].moduleId] = true;
    var expectedOrder = [];
    for (var t = 0; t < registry.modules.length; t++) {
      if (selected[registry.modules[t].moduleId]) expectedOrder.push(registry.modules[t].moduleId);
    }
    var actualOrder = [];
    for (var u = 0; u < manifest.modules.length; u++) actualOrder.push(manifest.modules[u].moduleId);
    if (JSON.stringify(actualOrder) !== JSON.stringify(expectedOrder)) {
      fail('MANIFEST_MODULE_ORDER_MISMATCH', 'manifest module order ' + JSON.stringify(actualOrder) + ' does not match the canonical registry order ' + JSON.stringify(expectedOrder));
    }
  }

  // --- step 6: readiness vs manifest ---
  //
  // Readiness<->manifest identity coherence is checked once, before the
  // module loops, continuing the fixed #398-C order started in step 5.

  function validateReadinessAgainstManifest(readiness, manifest) {
    if (readiness.deploymentId !== manifest.deploymentId) {
      fail('READINESS_DEPLOYMENT_ID_MISMATCH', 'readiness deploymentId "' + readiness.deploymentId + '" does not match manifest deploymentId "' + manifest.deploymentId + '"');
    }
    if (readiness.siteId !== manifest.siteId) {
      fail('READINESS_SITE_ID_MISMATCH', 'readiness siteId "' + readiness.siteId + '" does not match manifest siteId "' + manifest.siteId + '"');
    }
    // Duplicate moduleIds are rejected BEFORE per-module resolution (#398
    // F3.1-D) so a conflicting last-write readiness value can never overwrite
    // the authority for a module.
    var readinessIds = Object.create(null);
    for (var d = 0; d < readiness.modules.length; d++) {
      var duplicateId = readiness.modules[d].moduleId;
      if (readinessIds[duplicateId]) {
        fail('READINESS_DUPLICATE_MODULE', 'duplicate moduleId in readiness: "' + duplicateId + '"');
      }
      readinessIds[duplicateId] = true;
    }
    var manifestById = Object.create(null);
    for (var m = 0; m < manifest.modules.length; m++) {
      manifestById[manifest.modules[m].moduleId] = manifest.modules[m];
    }
    for (var i = 0; i < readiness.modules.length; i++) {
      var mod = readiness.modules[i];
      var resolved = manifestById[mod.moduleId];
      if (!resolved) {
        fail('READINESS_UNKNOWN_MODULE', 'readiness module "' + mod.moduleId + '" is not part of the deployment manifest');
      }
      readinessIds[mod.moduleId] = true;
      if (mod.available !== resolved.available) {
        fail('READINESS_AVAILABLE_CONTRADICTION', 'module "' + mod.moduleId + '": readiness available=' + mod.available + ' contradicts manifest available=' + resolved.available);
      }
      if (mod.route !== resolved.entryPath) {
        fail('READINESS_ROUTE_MISMATCH', 'module "' + mod.moduleId + '": readiness route "' + mod.route + '" does not match manifest entryPath "' + resolved.entryPath + '"');
      }
      if (mod.qualificationState !== resolved.qualificationState) {
        fail('READINESS_QUALIFICATION_STATE_MISMATCH', 'module "' + mod.moduleId + '": readiness qualificationState "' + mod.qualificationState + '" does not match manifest "' + resolved.qualificationState + '"');
      }
      // Label and capabilities coherence (#398 F3.1-D): the manifest/registry
      // entry is the authority; capabilities compare as a set.
      if (mod.label !== resolved.label) {
        fail('READINESS_LABEL_MISMATCH', 'module "' + mod.moduleId + '": readiness label "' + mod.label + '" does not match manifest label "' + resolved.label + '"');
      }
      if (!sameSet(mod.platformCapabilities, resolved.platformCapabilities)) {
        fail('READINESS_CAPABILITIES_MISMATCH', 'module "' + mod.moduleId + '": readiness platformCapabilities do not match the manifest entry');
      }
    }
    for (var k = 0; k < manifest.modules.length; k++) {
      var manifestModuleId = manifest.modules[k].moduleId;
      if (!readinessIds[manifestModuleId]) {
        fail('READINESS_MISSING_MODULE', 'readiness is missing manifest module "' + manifestModuleId + '"');
      }
    }
  }

  // --- EffectiveDeployment snapshot (deep-frozen, order authoritative) ---

  function buildSnapshot(input) {
    var manifest = input.manifest;
    var readinessById = Object.create(null);
    for (var r = 0; r < input.readiness.modules.length; r++) {
      readinessById[input.readiness.modules[r].moduleId] = input.readiness.modules[r];
    }
    var modules = [];
    for (var i = 0; i < manifest.modules.length; i++) {
      var mod = manifest.modules[i];
      var readinessEntry = readinessById[mod.moduleId];
      modules.push({
        moduleId: mod.moduleId,
        label: mod.label,
        route: mod.entryPath,
        enabled: mod.enabled,
        qualificationState: mod.qualificationState,
        available: mod.available,
        platformCapabilities: deepCopy(mod.platformCapabilities),
        readiness: readinessEntry.readiness,
        release: readinessEntry.release,
      });
    }
    return deepFreeze({
      snapshotVersion: '1',
      deploymentId: input.profile.deploymentId,
      siteId: input.profile.siteId,
      // Display authority is the PROFILE (#398 F3.1-D), verified equal to
      // manifest.display by MANIFEST_PROFILE_DISPLAY_MISMATCH above.
      display: deepCopy(input.profile.display),
      persistenceMode: input.profile.persistenceMode,
      // Provenance is diagnostic evidence copied from the manifest; it is
      // never runtime authorization.
      provenance: deepCopy(manifest.provenance),
      modules: modules,
    });
  }

  /**
   * Loads, validates and freezes one fixed site deployment. Throws a
   * PlatformConfigurationError (stable `code`) on any invalid input.
   */
  // Deterministic validation order (#398 F3.1-D). Fail closed on the first
  // mismatch; no fallback, no auto-repair:
  //   1. input shape, closed input keys and validator presence
  //      (CONFIG_INPUT_INVALID / CONFIG_INPUT_UNKNOWN_KEY /
  //      SCHEMA_VALIDATOR_REQUIRED);
  //   2. schema validators (per-artifact *_SCHEMA_INVALID);
  //   3. registry semantics: moduleId duplicates, route safety, entryPath
  //      uniqueness (the registry is the route authority);
  //   4. profile semantics: moduleId duplicates, registry membership,
  //      enabled/qualification coherence, qualification evidence;
  //   5. manifest coherence: identity vs profile incl. display, set equality
  //      vs profile, per-module state equality vs profile, registry technical
  //      identity, canonical registry order;
  //   6. readiness coherence: identity vs manifest, moduleId duplicates
  //      (before per-module resolution), per-module equality incl. label and
  //      capabilities as a set.
  function load(input) {
    var schemaValidators = input ? input.schemaValidators : undefined;
    validateInputShape(input, schemaValidators);
    validateSchemas(input, schemaValidators);
    validateRegistrySemantics(input.registry);
    validateProfileSemantics(input.profile, input.registry);
    validateManifestCompleteness(input.manifest, input.profile, input.registry);
    validateReadinessAgainstManifest(input.readiness, input.manifest);
    var snapshot = buildSnapshot(input);
    // Last step of a successful load: only fully validated, deep-frozen
    // snapshots are ever issued (and therefore trusted by PlatformContext).
    ISSUED_SNAPSHOTS.add(snapshot);
    return snapshot;
  }

  exports.ConfigurationRepository = {
    load: load,
  };

  // Internal issuance registry, attached non-enumerably so it is not part of
  // the documented public API surface (PlatformContext reads it to verify
  // snapshot origin; see the trust-boundary comment above).
  Object.defineProperty(exports, '__issuedEffectiveDeployments', {
    value: ISSUED_SNAPSHOTS,
    enumerable: false,
    writable: false,
    configurable: false,
  });
})(root.PromuevePlatform);
