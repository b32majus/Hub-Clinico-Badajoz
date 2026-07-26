(function (root, factory) {
    'use strict';
    var api = factory(root || {});
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root && typeof root === 'object') root.FarmaciaFollowupNavigationGuardV4 = api;
    if (root && root.document) api.install(root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
    'use strict';

    function resolvedNavigation(event, environment) {
        var env = environment || root;
        if (!event || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
        var target = event.target;
        if (!target || typeof target.closest !== 'function') return null;
        var anchor = target.closest('a[href]');
        if (!anchor || (typeof anchor.hasAttribute === 'function' && anchor.hasAttribute('download'))) return null;
        var targetName = String(typeof anchor.getAttribute === 'function' && anchor.getAttribute('target') || '').trim().toLowerCase();
        if (targetName && targetName !== '_self') return null;
        var raw = String(typeof anchor.getAttribute === 'function' && anchor.getAttribute('href') || '').trim();
        if (!raw || raw.charAt(0) === '#' || /^javascript\s*:/i.test(raw)) return null;
        var href;
        try { href = new env.URL(anchor.href || raw, env.location && env.location.href); } catch (error) { return null; }
        var currentProtocol;
        try { currentProtocol = new env.URL(env.location && env.location.href).protocol; } catch (error) { return null; }
        if (href.protocol !== 'http:' && href.protocol !== 'https:' && !(href.protocol === 'file:' && currentProtocol === 'file:')) return null;
        var finalHref = href.href;
        if (!finalHref || finalHref === String(env.location && env.location.href || '')) return null;
        return { anchor: anchor, href: finalHref };
    }

    function createGuard(environment, injected) {
        var env = environment || root;
        var deps = injected || {};
        var drafts = deps.drafts || env.FarmaciaFollowupDraftsV4;
        var unloadBypass = false;
        var navigationCount = 0;

        function absorb(event) {
            event.preventDefault();
            event.stopPropagation();
            if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
        }
        function onClick(event) {
            var navigation = resolvedNavigation(event, env);
            if (!navigation || !drafts || typeof drafts.isDirty !== 'function' || !drafts.isDirty()) return;
            if (typeof drafts.beforePageExit !== 'function') { absorb(event); return; }
            var decision = drafts.beforePageExit();
            absorb(event);
            if (decision !== 'proceed') return;
            unloadBypass = true;
            navigationCount += 1;
            if (typeof deps.navigate === 'function') deps.navigate(navigation.href);
            else env.location.assign(navigation.href);
        }
        function onBeforeUnload(event) {
            if (unloadBypass) { unloadBypass = false; return undefined; }
            if (!drafts || typeof drafts.isDirty !== 'function' || !drafts.isDirty()) return undefined;
            event.preventDefault();
            event.returnValue = '';
            return '';
        }
        function state() { return { unloadBypass: unloadBypass, navigationCount: navigationCount }; }
        return { onClick: onClick, onBeforeUnload: onBeforeUnload, state: state };
    }

    var installed = null;
    function install(environment, injected) {
        var env = environment || root;
        if (!env.document || installed) return installed;
        installed = createGuard(env, injected);
        env.document.addEventListener('click', installed.onClick, true);
        env.addEventListener('beforeunload', installed.onBeforeUnload);
        env.__farmaciaFollowupNavigationGuardV4Controller = installed;
        return installed;
    }

    return { resolvedNavigation: resolvedNavigation, createGuard: createGuard, install: install };
});
