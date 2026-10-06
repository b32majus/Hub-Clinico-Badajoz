/**
 * PROMueve Nexus Home — Renderer (F3.2 WU-A shell + WU-B navigation + NEXUS_HOME_UX_01).
 *
 * Presentation plus minimal same-tab navigation over an already-trusted
 * PlatformContext. It reads only the technical branding and the registered
 * module descriptors; it never reconstructs deployment truth, never invents a
 * route and never falls back to a legacy entrypoint.
 *
 * Frozen DOM markers (class names):
 *   nexus-home__product-name  textContent = branding.productName
 *   nexus-home__site-name     textContent = branding.siteName
 *   nexus-home__tile          NAVIGABLE affordance only: the native Entrar
 *                             button of an available module, carrying
 *                             data-module-id = moduleId
 *   nexus-home__empty         explicit empty state when there are zero
 *                             navigable modules
 *   nexus-home__error         explicit fail-closed error state whose
 *                             textContent includes failure.code
 *
 * NEXUS_HOME_UX_01 presentation (demo-quality human entry surface only):
 *   - hero: brand mark + product wordmark, then exactly one instruction
 *     ("Selecciona tu espacio de trabajo"), then discreet site context.
 *   - every REGISTERED module renders a card with only a monogram, the Home
 *     presentation name, the availability state and, when available, the
 *     native Entrar action. Unavailable modules stay visible as muted,
 *     non-interactive cards: no fabricated route, no link, no listener, and
 *     getModuleRoute is never called for them.
 *
 * WU-B navigation: the Entrar button of a navigable module gets a click
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

  // Single primary instruction shown in the hero. No subtitle is rendered.
  var HOME_INSTRUCTION = 'Selecciona tu espacio de trabajo';

  // Availability states shown on module cards. Readiness vocabulary stays
  // hidden from the ordinary user: only these two human states exist here.
  var STATE_AVAILABLE = 'Disponible';
  var STATE_UNAVAILABLE = 'No disponible en este entorno';

  // Single supported action label for available modules.
  var ACTION_LABEL = 'Entrar';

  // Home-only presentation aliases (frozen). They apply exclusively to
  // moduleIds actually returned as registered by PlatformContext, so the
  // derma alias can only ever take effect if a real "derma" module is
  // registered in the future. Any other registered module falls back to
  // descriptor.label; no name is ever invented.
  var PRESENTATION_ALIASES = {
    reuma: 'ReumaNEXus',
    farmacia: 'FarmaNEXus',
    derma: 'DermaNEXus',
  };

  // Compact brand mark: the SAME bytes as the existing Nexus isotipo, embedded
  // as a local data URI so the Home entry surface stays self-contained.
  var BRAND_MARK_DATA_URI = 'data:image/png;base64,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';

  function readString(value) {
    return typeof value === 'string' ? value : '';
  }

  function presentationName(descriptor) {
    var moduleId = readString(descriptor && descriptor.moduleId);
    if (Object.prototype.hasOwnProperty.call(PRESENTATION_ALIASES, moduleId)) {
      return PRESENTATION_ALIASES[moduleId];
    }
    return readString(descriptor && descriptor.label);
  }

  function monogramFor(name) {
    if (typeof name !== 'string' || name.length === 0) return '';
    var first = Array.from(name)[0];
    return typeof first === 'string' ? first : '';
  }

  // Registered descriptors in snapshot order. Historical synthetic doubles
  // expose only getNavigableModules(): for that shape alone the registered set
  // is treated as the navigable set. When getModules() exists this fallback
  // never applies and deployment truth is never reconstructed.
  function registeredModules(context) {
    if (context && typeof context.getModules === 'function') {
      var all = context.getModules();
      return Array.isArray(all) ? all : [];
    }
    if (context && typeof context.getNavigableModules === 'function') {
      var navigable = context.getNavigableModules();
      return Array.isArray(navigable) ? navigable : [];
    }
    return [];
  }

  // Availability truth per registered moduleId. Prefers isModuleAvailable when
  // the facade exposes it; otherwise uses membership in getNavigableModules().
  function navigableById(context, registered) {
    var ids = {};
    var useAvailability = Boolean(context && typeof context.isModuleAvailable === 'function');
    var navigable = (!useAvailability && context && typeof context.getNavigableModules === 'function')
      ? context.getNavigableModules()
      : null;
    if (useAvailability) {
      for (var i = 0; i < registered.length; i++) {
        var moduleId = readString(registered[i] && registered[i].moduleId);
        if (moduleId !== '' && context.isModuleAvailable(moduleId) === true) ids[moduleId] = true;
      }
    } else if (Array.isArray(navigable)) {
      for (var j = 0; j < navigable.length; j++) {
        var navId = readString(navigable[j] && navigable[j].moduleId);
        if (navId !== '') ids[navId] = true;
      }
    }
    return ids;
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

  // One click listener on the native Entrar button of a navigable module. The
  // module id is captured as a value, never read back from the DOM, so the
  // rendered tree stays free of routing authority. Unavailable cards are never
  // wired: they carry no listener at all.
  function wireTile(tile, context, moduleId, rootEl, document) {
    tile.addEventListener('click', function () {
      navigateToModule(context, moduleId, rootEl, document);
    });
  }

  // One module card per registered descriptor: monogram, presentation name,
  // availability state and, only when navigable, the native Entrar button
  // (the sole .nexus-home__tile). Unavailable cards are muted and carry no
  // action, no link and no listener.
  function renderModuleCard(context, descriptor, navigable, rootEl, document) {
    var moduleId = readString(descriptor && descriptor.moduleId);
    var name = presentationName(descriptor);

    var card = document.createElement('li');
    card.className = navigable
      ? 'nexus-home__module-card nexus-home__module-card--available'
      : 'nexus-home__module-card nexus-home__module-card--unavailable';
    card.setAttribute('data-module-id', moduleId);

    var monogram = document.createElement('span');
    monogram.className = 'nexus-home__monogram';
    monogram.setAttribute('aria-hidden', 'true');
    monogram.textContent = monogramFor(name);
    card.appendChild(monogram);

    var nameEl = document.createElement('p');
    nameEl.className = 'nexus-home__module-name';
    nameEl.textContent = name;
    card.appendChild(nameEl);

    var state = document.createElement('p');
    state.className = 'nexus-home__module-state';
    state.textContent = navigable ? STATE_AVAILABLE : STATE_UNAVAILABLE;
    card.appendChild(state);

    if (navigable) {
      var action = document.createElement('button');
      action.className = 'nexus-home__tile';
      action.setAttribute('data-module-id', moduleId);
      action.textContent = ACTION_LABEL;
      wireTile(action, context, moduleId, rootEl, document);
      card.appendChild(action);
    }

    return card;
  }

  function renderHome(context, document) {
    var branding = (context && typeof context.getBranding === 'function' && context.getBranding()) || {};
    var rootEl = document.createElement('div');
    rootEl.className = 'nexus-home';

    var header = document.createElement('header');
    header.className = 'nexus-home__header';

    var mark = document.createElement('img');
    mark.className = 'nexus-home__brand-mark';
    mark.setAttribute('src', BRAND_MARK_DATA_URI);
    mark.setAttribute('alt', 'Isotipo NEXus');
    header.appendChild(mark);

    var product = document.createElement('h1');
    product.className = 'nexus-home__product-name';
    product.textContent = readString(branding.productName);
    header.appendChild(product);

    var instruction = document.createElement('p');
    instruction.className = 'nexus-home__instruction';
    instruction.textContent = HOME_INSTRUCTION;
    header.appendChild(instruction);

    var site = document.createElement('p');
    site.className = 'nexus-home__site-name';
    site.textContent = readString(branding.siteName);
    header.appendChild(site);

    rootEl.appendChild(header);

    var registered = registeredModules(context);
    var navigableIds = navigableById(context, registered);
    var navigableCount = 0;
    for (var k = 0; k < registered.length; k++) {
      if (navigableIds[readString(registered[k] && registered[k].moduleId)] === true) navigableCount++;
    }

    if (registered.length > 0) {
      var list = document.createElement('ul');
      list.className = 'nexus-home__modules';
      for (var i = 0; i < registered.length; i++) {
        var descriptor = registered[i];
        var isNavigable = navigableIds[readString(descriptor && descriptor.moduleId)] === true;
        list.appendChild(renderModuleCard(context, descriptor, isNavigable, rootEl, document));
      }
      rootEl.appendChild(list);
    }

    if (navigableCount === 0) {
      var empty = document.createElement('p');
      empty.className = 'nexus-home__empty';
      empty.textContent = 'No hay módulos navegables en este despliegue.';
      rootEl.appendChild(empty);
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
