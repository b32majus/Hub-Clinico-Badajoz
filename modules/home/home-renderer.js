/**
 * PROMueve Nexus Home — Renderer (F3.2 WU-A).
 *
 * Pure presentation over an already-trusted PlatformContext. It reads only the
 * technical branding and the navigable module descriptors; it never
 * reconstructs deployment truth, never invents a route and never falls back to
 * a legacy entrypoint.
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
 * WU-A tiles carry NO href and NO route: no rendered element has an href
 * attribute and no rendered text or attribute contains ".html". Routes arrive
 * only in WU-B through PlatformContext.getModuleRoute(moduleId).
 *
 * Dual browser/Node classic script (no import/export, no framework). It
 * attaches to the PromueveHome namespace only; it transports no clinical data.
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
        var tile = document.createElement('li');
        tile.className = 'nexus-home__tile';
        tile.setAttribute('data-module-id', readString(module.moduleId));
        tile.textContent = readString(module.label);
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
