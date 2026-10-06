/**
 * PROMueve Nexus Home — Renderer (F3.2 WU-A shell + WU-B navigation + NEXUS_HOME_UX_01).
 *
 * Presentation plus minimal same-tab navigation over an already-trusted
 * PlatformContext. It reads only the technical branding and the registered
 * module descriptors; it never reconstructs deployment truth, never invents a
 * route and never falls back to a legacy entrypoint.
 *
 * Frozen DOM markers (class names):
 *   nexus-home__brand-lockup   visible approved full NEXus lockup (local file,
 *                              never a data URI), alt = "NEXus"
 *   nexus-home__product-name  textContent = branding.productName; visually
 *                             hidden (semantic/accessibility naming only) so the
 *                             lockup stays the single visible brand
 *   nexus-home__site-name     textContent = branding.siteName
 *   nexus-home__tile          NAVIGABLE affordance only: the native Entrar
 *                             button of an available module, carrying
 *                             data-module-id = moduleId
 *   nexus-home__module-card--future + data-future-module = "derma"
 *                             PRESENTATION-ONLY future card (DermaNEXus /
 *                             "Próximamente"): never registered, never routed,
 *                             no tile, no listener, no href
 *   nexus-home__empty         explicit empty state when there are zero
 *                             navigable modules
 *   nexus-home__error         explicit fail-closed error state whose
 *                             textContent includes failure.code
 *
 * NEXUS_HOME_UX_01 presentation (demo-quality human entry surface only):
 *   - hero: full approved lockup as the dominant visible brand, then exactly
 *     one instruction ("Selecciona tu espacio de trabajo"), then discreet
 *     site context. The product wordmark stays in the accessibility tree as a
 *     visually-hidden h1; no visible "NEXus" text duplicates the lockup.
 *   - every REGISTERED module renders a card with only a monogram, the Home
 *     presentation name, the availability state and, when available, the
 *     native Entrar action. Unavailable modules stay visible as muted,
 *     non-interactive cards: no fabricated route, no link, no listener, and
 *     getModuleRoute is never called for them.
 *   - one extra PRESENTATION-ONLY card shows the human-approved future
 *     DermaNEXus ("Próximamente"). It is not sourced from PlatformContext,
 *     never consults availability/routing, and carries no interactive
 *     affordance.
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

  // Visible Home brand: the approved full NEXus lockup, served as a local
  // optimized web derivative (assets/branding/nexus-home-lockup.png) and
  // referenced by path so the Home release artifact carries it as a declared
  // file. It is never embedded as a data URI.
  var BRAND_LOCKUP_SRC = 'assets/branding/nexus-home-lockup.png';
  var BRAND_LOCKUP_ALT = 'NEXus';

  // Human-approved PRESENTATION-ONLY future card. It is rendered separately
  // from PlatformContext truth: never registered, never availability-checked,
  // never routed, never interactive.
  var FUTURE_DERMA_NAME = 'DermaNEXus';
  var STATE_FUTURE = 'Próximamente';

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

  // The human-approved PRESENTATION-ONLY future card (DermaNEXus /
  // "Próximamente"). It is rendered separately from PlatformContext truth:
  // no data-module-id (that marker denotes registered runtime modules), no
  // tile, no link, no listener, and the context facade is never consulted
  // for it — neither isModuleAvailable("derma") nor getModuleRoute("derma").
  // The future state is a non-interactive badge, never a button.
  function renderFutureDermaCard(document) {
    var card = document.createElement('li');
    card.className = 'nexus-home__module-card nexus-home__module-card--future';
    card.setAttribute('data-future-module', 'derma');

    var monogram = document.createElement('span');
    monogram.className = 'nexus-home__monogram';
    monogram.setAttribute('aria-hidden', 'true');
    monogram.textContent = monogramFor(FUTURE_DERMA_NAME);
    card.appendChild(monogram);

    var nameEl = document.createElement('p');
    nameEl.className = 'nexus-home__module-name';
    nameEl.textContent = FUTURE_DERMA_NAME;
    card.appendChild(nameEl);

    var state = document.createElement('p');
    state.className = 'nexus-home__module-state nexus-home__module-state--future';
    state.textContent = STATE_FUTURE;
    card.appendChild(state);

    return card;
  }

  function renderHome(context, document) {
    var branding = (context && typeof context.getBranding === 'function' && context.getBranding()) || {};
    var rootEl = document.createElement('div');
    rootEl.className = 'nexus-home';

    var header = document.createElement('header');
    header.className = 'nexus-home__header';

    var lockup = document.createElement('img');
    lockup.className = 'nexus-home__brand-lockup';
    lockup.setAttribute('src', BRAND_LOCKUP_SRC);
    lockup.setAttribute('alt', BRAND_LOCKUP_ALT);
    header.appendChild(lockup);

    // Semantic product naming only: the full lockup above is the single
    // visible brand, so the h1 stays in the accessibility tree but hidden
    // from sight (never a duplicated visible "NEXus" below the logo).
    var product = document.createElement('h1');
    product.className = 'nexus-home__product-name nexus-home__visually-hidden';
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

    // One module card per registered descriptor, plus the separately
    // rendered PRESENTATION-ONLY future Derma card (never registered,
    // never navigable, never routed).
    var list = document.createElement('ul');
    list.className = 'nexus-home__modules';
    for (var i = 0; i < registered.length; i++) {
      var descriptor = registered[i];
      var isNavigable = navigableIds[readString(descriptor && descriptor.moduleId)] === true;
      list.appendChild(renderModuleCard(context, descriptor, isNavigable, rootEl, document));
    }
    list.appendChild(renderFutureDermaCard(document));
    rootEl.appendChild(list);

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
