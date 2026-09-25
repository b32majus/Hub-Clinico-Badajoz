/**
 * PROMueve Nexus Home — Bootstrap (F3.2 WU-A).
 *
 * Thin, fail-closed bridge between the packaged deployment artifacts and the
 * trusted platform seam. It owns no deployment logic: it forwards the CLOSED
 * load input to PromuevePlatform.ConfigurationRepository.load and then issues
 * a read-only facade with PromuevePlatform.PlatformContext.fromSnapshot.
 *
 * Input (closed): { registry, profile, manifest, readiness, schemaValidators }.
 * Missing validators, incoherent artifacts and unknown keys are decided by the
 * F3.1 seam and surfaced here verbatim through its stable platform error code.
 * This module never repairs deployment truth, never invents a validator,
 * never falls back to a legacy entrypoint and never throws.
 *
 * The closed-input check below intentionally mirrors the seam's own
 * CONFIG_INPUT_UNKNOWN_KEY guarantee. It is boundary enforcement only (the
 * bootstrap contract is a closed input); every artifact/schema/coherence
 * decision stays exclusively in the seam. Keeping it here makes the failure
 * order deterministic even when a caller passes an unknown key together with
 * an incomplete validator map, which the seam would otherwise report first.
 *
 * Dual browser/Node classic script (no import/export, no framework). It
 * attaches to the PromueveHome namespace only; it transports no clinical data
 * and never touches the clinical runtime namespaces.
 *
 * Usage:
 *   var result = PromueveHome.Bootstrap.bootstrap({ registry, profile,
 *     manifest, readiness, schemaValidators });
 *   if (result.ok) { var context = result.context; }
 *   else { var failure = result.failure; } // { code, message }
 */

(function (root) {
  'use strict';

  var home = root.PromueveHome = root.PromueveHome || {};

  var CLOSED_INPUT_KEYS = ['registry', 'profile', 'manifest', 'readiness', 'schemaValidators'];

  function unknownInputKey(input) {
    if (input === null || typeof input !== 'object' || Array.isArray(input)) return null;
    for (var key in input) {
      if (Object.prototype.hasOwnProperty.call(input, key) && CLOSED_INPUT_KEYS.indexOf(key) === -1) {
        return key;
      }
    }
    return null;
  }

  function toFailure(err) {
    var code = err && typeof err.code === 'string' && err.code.length > 0 ? err.code : 'HOME_BOOTSTRAP_FAILED';
    var message = err && typeof err.message === 'string' && err.message.length > 0 ? err.message : String(err);
    return { code: code, message: message };
  }

  function bootstrap(input) {
    try {
      var unknown = unknownInputKey(input);
      if (unknown !== null) {
        return {
          ok: false,
          failure: {
            code: 'CONFIG_INPUT_UNKNOWN_KEY',
            message: 'unknown top-level load input key: "' + unknown + '"',
          },
        };
      }
      var platform = root.PromuevePlatform || {};
      var snapshot = platform.ConfigurationRepository.load(input);
      var context = platform.PlatformContext.fromSnapshot(snapshot);
      return { ok: true, context: context };
    } catch (err) {
      return { ok: false, failure: toFailure(err) };
    }
  }

  home.Bootstrap = { bootstrap: bootstrap };
})(typeof window !== 'undefined' ? window : globalThis);
