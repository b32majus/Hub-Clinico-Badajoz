/**
 * PROMueve Nexus Home — Page controller (F3.2 WU-A).
 *
 * Composition root of the Home shell. It fetches the four packaged deployment
 * artifacts from data/platform/home/, hands the CLOSED input to
 * PromueveHome.Bootstrap.bootstrap, and renders the resulting trusted context
 * into <element id="home-root"> through PromueveHome.Renderer.renderHome.
 *
 * Fail-closed: any fetch error or bootstrap failure renders the explicit
 * PromueveHome.Renderer.renderError state and resolves with
 * { ok: false, failure: { code, message } }. start() never throws and never
 * falls back to a legacy entrypoint.
 *
 * Dual browser/Node classic script (no import/export, no framework, no CDN,
 * no remote configuration). It attaches to the PromueveHome namespace only;
 * it transports no clinical data.
 *
 * Usage:
 *   PromueveHome.Page.start().then(function (result) { ... });
 */

(function (root) {
  'use strict';

  var home = root.PromueveHome = root.PromueveHome || {};

  var ARTIFACT_PATHS = {
    registry: 'data/platform/home/module-registry.json',
    profile: 'data/platform/home/deployment-profile.json',
    manifest: 'data/platform/home/deployment-manifest.json',
    readiness: 'data/platform/home/module-readiness.json',
  };
  var ARTIFACT_KEYS = ['registry', 'profile', 'manifest', 'readiness'];

  function describeError(err) {
    if (err && typeof err.message === 'string' && err.message.length > 0) return err.message;
    return String(err);
  }

  function toFailure(err) {
    if (err && err.failure && typeof err.failure.code === 'string') return err.failure;
    var code = err && typeof err.code === 'string' && err.code.length > 0 ? err.code : 'HOME_START_FAILED';
    var message = err && typeof err.message === 'string' && err.message.length > 0 ? err.message : String(err);
    return { code: code, message: message };
  }

  function fetchArtifact(url) {
    return root.fetch(url).then(function (response) {
      if (!response || response.ok !== true) {
        throw { code: 'HOME_ARTIFACT_FETCH_FAILED', message: 'failed to fetch ' + url };
      }
      return response.json();
    }, function (err) {
      throw {
        code: 'HOME_ARTIFACT_FETCH_FAILED',
        message: 'failed to fetch ' + url + ': ' + describeError(err),
      };
    });
  }

  function mount(documentObject, node) {
    if (!documentObject || typeof documentObject.getElementById !== 'function') return;
    var homeRoot = documentObject.getElementById('home-root');
    if (!homeRoot || typeof homeRoot.appendChild !== 'function') return;
    // Clear any previous render, then mount the new tree. The trust decision
    // has already been made by the seam; this only swaps the presentation.
    homeRoot.textContent = '';
    homeRoot.appendChild(node);
  }

  function renderFailure(documentObject, failure) {
    try {
      var renderer = root.PromueveHome && root.PromueveHome.Renderer;
      if (renderer && typeof renderer.renderError === 'function') {
        mount(documentObject, renderer.renderError(failure, documentObject));
      }
    } catch (err) {
      // Rendering the failure state must never mask the original failure.
    }
    return { ok: false, failure: failure };
  }

  function run() {
    var documentObject = root.document;
    var requests = ARTIFACT_KEYS.map(function (key) {
      return fetchArtifact(ARTIFACT_PATHS[key]);
    });
    return Promise.all(requests).then(function (docs) {
      var input = {
        registry: docs[0],
        profile: docs[1],
        manifest: docs[2],
        readiness: docs[3],
        schemaValidators: root.PromueveHome.SchemaValidators,
      };
      var result = root.PromueveHome.Bootstrap.bootstrap(input);
      if (!result || result.ok !== true) {
        return renderFailure(documentObject, toFailure(result));
      }
      var renderer = root.PromueveHome.Renderer;
      mount(documentObject, renderer.renderHome(result.context, documentObject));
      return { ok: true, context: result.context };
    });
  }

  function start() {
    try {
      return Promise.resolve(run()).catch(function (err) {
        return renderFailure(root.document, toFailure(err));
      });
    } catch (err) {
      return Promise.resolve(renderFailure(root.document, toFailure(err)));
    }
  }

  home.Page = { start: start };
})(typeof window !== 'undefined' ? window : globalThis);
