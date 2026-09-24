/**
 * PROMueve Nexus platform seam — PlatformContext (F3.1 WU-B).
 *
 * Small read-only query facade over an ALREADY-VALIDATED, deep-frozen
 * EffectiveDeployment snapshot produced by
 * PromuevePlatform.ConfigurationRepository.load (F3.1 WU-A). It never
 * reconstructs, sanitizes or re-validates deployment semantics: the
 * repository owns validation. A snapshot that does not conform to the
 * expected frozen shape fails closed here with SNAPSHOT_INVALID.
 *
 * ADR-002 boundary: this seam transports NO clinical data — no patient
 * identifiers, no workbooks, no cohorts, no clinical rules. Home (F3.2) is
 * shell/navigation only; module readiness exposed here is technical
 * information, never clinical interpretation.
 *
 * ADR-003 boundary: unknown ids and incoherent requests fail explicitly with
 * stable error codes (MODULE_UNKNOWN, MODULE_NOT_AVAILABLE). No nulls, no
 * guessing, no silent fallback routes.
 *
 * Dual browser/Node classic script (no import/export, no framework). Attaches
 * to the platform namespace only; it never touches the clinical HubTools
 * namespace.
 *
 * Usage (browser or Node sandbox):
 *   var snapshot = PromuevePlatform.ConfigurationRepository.load({...});
 *   var context = PromuevePlatform.PlatformContext.fromSnapshot(snapshot);
 */

var root = typeof window !== 'undefined' ? window : globalThis;
root.PromuevePlatform = root.PromuevePlatform || {};

(function (exports) {
  'use strict';

  function PlatformContextError(code, message) {
    Error.call(this, message);
    this.name = 'PlatformContextError';
    this.code = code;
    this.message = message;
  }
  PlatformContextError.prototype = Object.create(Error.prototype);
  PlatformContextError.prototype.constructor = PlatformContextError;
  exports.PlatformContextError = PlatformContextError;

  function fail(code, message) {
    throw new PlatformContextError(code, message);
  }

  /**
   * Shape check only (frozen object, version, identity strings, modules
   * array). Deployment semantics stay owned by ConfigurationRepository; a
   * non-conforming object is never repaired or sanitized here.
   */
  function validateSnapshotShape(snapshot) {
    if (snapshot === null || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
      fail('SNAPSHOT_INVALID', 'PlatformContext.fromSnapshot requires an EffectiveDeployment snapshot object');
    }
    if (!Object.isFrozen(snapshot)) {
      fail('SNAPSHOT_INVALID', 'snapshot must be the frozen EffectiveDeployment produced by ConfigurationRepository.load');
    }
    if (snapshot.snapshotVersion !== '1') {
      fail('SNAPSHOT_INVALID', 'unsupported snapshotVersion "' + String(snapshot.snapshotVersion) + '": expected "1"');
    }
    if (typeof snapshot.deploymentId !== 'string' || typeof snapshot.siteId !== 'string') {
      fail('SNAPSHOT_INVALID', 'snapshot is missing string deploymentId or siteId');
    }
    if (!Array.isArray(snapshot.modules)) {
      fail('SNAPSHOT_INVALID', 'snapshot is missing its modules array');
    }
  }

  /**
   * Names of every query on the facade. The returned facade object is
   * frozen, so it carries no writable state-bearing property: consumers can
   * only call these read-only queries over the closed-over snapshot.
   */
  var QUERY_METHODS = [
    'getDeploymentId',
    'getSiteId',
    'getPersistenceMode',
    'getBranding',
    'getProvenance',
    'getModules',
    'getModule',
    'isModuleAvailable',
    'getNavigableModules',
    'getModuleRoute',
    'getModuleReadiness',
  ];

  /**
   * Builds the read-only facade. All queries close over the given snapshot;
   * there is no state, no events and no caching beyond that closure.
   */
  function fromSnapshot(snapshot) {
    validateSnapshotShape(snapshot);

    function findModule(moduleId, method) {
      if (typeof moduleId !== 'string' || moduleId === '') {
        fail('MODULE_UNKNOWN', method + ' requires a non-empty moduleId string');
      }
      for (var i = 0; i < snapshot.modules.length; i++) {
        if (snapshot.modules[i].moduleId === moduleId) return snapshot.modules[i];
      }
      fail('MODULE_UNKNOWN', method + ': moduleId "' + moduleId + '" is not part of the deployment snapshot');
    }

    var facade = {
      getDeploymentId: function () {
        return snapshot.deploymentId;
      },
      getSiteId: function () {
        return snapshot.siteId;
      },
      getPersistenceMode: function () {
        return snapshot.persistenceMode;
      },
      /** Technical display object from the snapshot (frozen; never clinical). */
      getBranding: function () {
        return snapshot.display;
      },
      getProvenance: function () {
        return snapshot.provenance;
      },
      /**
       * All registered module descriptors in snapshot order, as the frozen
       * snapshot objects themselves (including unavailable modules). The
       * array is returned as-is: it is frozen, so consumers cannot mutate
       * the authority.
       */
      getModules: function () {
        return snapshot.modules;
      },
      /**
       * One module descriptor. Unknown ids fail with MODULE_UNKNOWN: there
       * is no null result and no fallback module.
       */
      getModule: function (moduleId) {
        return findModule(moduleId, 'getModule');
      },
      /**
       * True only when the registered module has available === true. Unknown
       * ids fail with MODULE_UNKNOWN instead of a silent false.
       */
      isModuleAvailable: function (moduleId) {
        return findModule(moduleId, 'isModuleAvailable').available === true;
      },
      /**
       * Descriptors with available === true only, in snapshot order.
       * Unqualified and disabled modules stay registered but are never
       * navigable.
       */
      getNavigableModules: function () {
        var navigable = [];
        for (var i = 0; i < snapshot.modules.length; i++) {
          if (snapshot.modules[i].available === true) navigable.push(snapshot.modules[i]);
        }
        return navigable;
      },
      /**
       * The declared route for an available module. Unknown ids fail with
       * MODULE_UNKNOWN; known-but-unavailable modules fail with
       * MODULE_NOT_AVAILABLE. There is no fallback route.
       */
      getModuleRoute: function (moduleId) {
        var mod = findModule(moduleId, 'getModuleRoute');
        if (mod.available !== true) {
          fail('MODULE_NOT_AVAILABLE', 'getModuleRoute: module "' + moduleId + '" is registered but not available in this deployment');
        }
        return mod.route;
      },
      /**
       * Technical readiness value for any registered module, available or
       * not (readiness is technical information, not navigation). Unknown
       * ids fail with MODULE_UNKNOWN.
       */
      getModuleReadiness: function (moduleId) {
        return findModule(moduleId, 'getModuleReadiness').readiness;
      },
    };
    for (var q = 0; q < QUERY_METHODS.length; q++) {
      if (typeof facade[QUERY_METHODS[q]] !== 'function') {
        fail('SNAPSHOT_INVALID', 'internal error: missing facade query ' + QUERY_METHODS[q]);
      }
    }
    return Object.freeze(facade);
  }

  exports.PlatformContext = {
    fromSnapshot: fromSnapshot,
  };
})(root.PromuevePlatform);
