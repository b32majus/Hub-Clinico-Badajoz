/**
 * PROMueve Nexus Home — Renderer (F3.2 WU-A shell + WU-B navigation).
 *
 * Presentation plus minimal same-tab navigation over an already-trusted
 * PlatformContext. It reads only the technical branding and the navigable
 * module descriptors; it never reconstructs deployment truth, never invents a
 * route and never falls back to a legacy entrypoint.
 *
 * Frozen DOM markers (class names):
 *   nexus-home__product-name  textContent = branding.productName
 *   nexus-home__site-name     textContent = branding.siteName
 *   nexus-home__tile          one per getNavigableModules() entry, carrying
 *                             data-module-id = moduleId
 *   nexus-home__empty         explicit empty state when there are zero
 *                             navigable modules
 *   nexus-home__error         explicit fail-closed error state whose
 *                             textContent includes failure.code
 *
 * WU-B navigation (issue #403): every tile of a navigable module gets a click
 * listener whose ONLY source of routing authority is the facade,
 * PlatformContext.getModuleRoute(moduleId), resolved AT CLICK TIME. The route
 * is never written into the rendered tree, never cached, never concatenated
 * and never repaired, so no element carries an href attribute and no rendered
 * text or attribute embeds a route string. A failed resolution fails closed:
 * Home renders the explicit error state and does NOT navigate anywhere.
 * Navigation is same-tab only (window.location.assign); it never opens a new
 * window and never manipulates browser history.
 *
 * Dual browser/Node classic script (no import/export, no framework). It
 * attaches to the PromueveHome namespace only; it transports no clinical data
 * and never touches the clinical runtime namespaces.
 *
 * Usage:
 *   var rootEl = PromueveHome.Renderer.renderHome(context, document);
 *   var errEl  = PromueveHome.Renderer.renderError(failure, document);
 */

(function (root) {
  'use strict';

  var home = root.PromueveHome = root.PromueveHome || {};

  function readString(value) {
    return typeof value === 'string' ? value : '';
  }

  function failureOf(err, fallbackCode) {
    var code = err && typeof err.code === 'string' && err.code.length > 0 ? err.code : fallbackCode;
    var message = err && typeof err.message === 'string' && err.message.length > 0
      ? err.message
      : String(err);
    return { code: code, message: message };
  }

  // Replaces the mounted Home view with the explicit fail-closed error state.
  // Navigation never falls back: an unresolved route is a terminal Home state,
  // never a legacy entrypoint and never an invented route.
  function renderNavigationFailure(rootEl, failure, document) {
    if (typeof rootEl.removeChild === 'function') {
      while (rootEl.firstChild) rootEl.removeChild(rootEl.firstChild);
    }
    rootEl.appendChild(renderError(failure, document));
  }

  // Resolves the route AT CLICK TIME from the trusted facade only. The route
  // is never embedded in the DOM, cached, concatenated or repaired: on any
  // resolution failure Home fails closed instead of navigating. Same-tab
  // navigation is the only transport (no new window, no history change).
  function navigateToModule(context, moduleId, rootEl, document) {
    var route;
    try {
      route = context.getModuleRoute(moduleId);
    } catch (err) {
      renderNavigationFailure(rootEl, failureOf(err, 'MODULE_ROUTE_UNRESOLVED'), document);
      return;
    }
    if (typeof route !== 'string' || route.length === 0) {
      renderNavigationFailure(rootEl, {
        code: 'MODULE_ROUTE_INVALID',
        message: 'getModuleRoute returned a non-string or empty route for "' + moduleId + '"',
      }, document);
      return;
    }
    if (!root.location || typeof root.location.assign !== 'function') {
      renderNavigationFailure(rootEl, {
        code: 'MODULE_NAVIGATION_UNAVAILABLE',
        message: 'window.location.assign is not available in this environment',
      }, document);
      return;
    }
    root.location.assign(route);
  }

  // One click listener per navigable tile. The module id is captured as a
  // value, never read back from the DOM, so the rendered tree stays free of
  // routing authority.
  function wireTile(tile, context, moduleId, rootEl, document) {
    tile.addEventListener('click', function () {
      navigateToModule(context, moduleId, rootEl, document);
    });
  }

  function renderHome(context, document) {
    var branding = (context && context.getBranding()) || {};
    var rootEl = document.createElement('div');
    rootEl.className = 'nexus-home';

    var header = document.createElement('header');
    header.className = 'nexus-home__header';

    var product = document.createElement('h1');
    product.className = 'nexus-home__product-name';
    product.textContent = readString(branding.productName);
    header.appendChild(product);

    var site = document.createElement('p');
    site.className = 'nexus-home__site-name';
    site.textContent = readString(branding.siteName);
    header.appendChild(site);

    rootEl.appendChild(header);

    var navigable = (context && context.getNavigableModules()) || [];
    if (navigable.length === 0) {
      var empty = document.createElement('p');
      empty.className = 'nexus-home__empty';
      empty.textContent = 'No hay módulos navegables en este despliegue.';
      rootEl.appendChild(empty);
    } else {
      var list = document.createElement('ul');
      list.className = 'nexus-home__modules';
      for (var i = 0; i < navigable.length; i++) {
        var module = navigable[i];
        var moduleId = readString(module.moduleId);
        var tile = document.createElement('li');
        tile.className = 'nexus-home__tile';
        tile.setAttribute('data-module-id', moduleId);
        tile.textContent = readString(module.label);
        wireTile(tile, context, moduleId, rootEl, document);
        list.appendChild(tile);
      }
      rootEl.appendChild(list);
    }

    return rootEl;
  }

  function renderError(failure, document) {
    var rootEl = document.createElement('div');
    rootEl.className = 'nexus-home__error';
    var code = failure && typeof failure.code === 'string' && failure.code.length > 0
      ? failure.code
      : 'HOME_ERROR';
    rootEl.textContent = 'No se pudo iniciar el Home: ' + code;
    return rootEl;
  }

  home.Renderer = {
    renderHome: renderHome,
    renderError: renderError,
  };
})(typeof window !== 'undefined' ? window : globalThis);
