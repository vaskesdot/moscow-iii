/*!
 * genesis_nav.js — Genesis network spider-bar (g2.4.0)
 * Bidirectional HTML connectivity across ALL Genesis Render servers.
 * - Floating BOTTOM bar, rendered as a top-layer overlay (z-index max), NOT tied to host page markup.
 * - Sits ABOVE every daughter page's own menu; fully independent of it.
 * - Source of truth: HUB genesis-l0-core /api/registry. Falls back to the embedded copy below if hub is unreachable.
 * - Hideable: collapse/expand toggle, state persisted in localStorage.
 * Doctrine: hub<->spoke and spoke<->spoke navigation, one shared widget, autonomous infra (no HITL).
 * Drop-in: <script src="/genesis_nav.js" defer></script>  (place near </body> on every page)
 */
(function () {
  "use strict";
  if (window.__GENESIS_NAV_LOADED__) return;
  window.__GENESIS_NAV_LOADED__ = true;

  var HUB = "https://genesis-l0-core.onrender.com";
  var REGISTRY_PATH = "/api/registry";
  var LS_KEY = "genesis_nav_collapsed";

  // --- Embedded fallback registry (kept in sync with genesis_registry.json) ---
  var FALLBACK = [{"id": "genesis-l0-core", "name": "L0 Core (HUB)", "url": "https://genesis-l0-core.onrender.com", "health": "/health", "role": "hub", "repo": "vaskesdot/genesis-l0-core"}, {"id": "genesis-iphk", "name": "IPHK", "url": "https://genesis-iphk.onrender.com", "health": "/api/health", "role": "spoke", "repo": "vaskesdot/genesis-iphk"}, {"id": "genesis-recordati-global", "name": "Recordati Global", "url": "https://genesis-recordati-global.onrender.com", "health": "/api/health", "role": "spoke", "repo": "vaskesdot/genesis-recordati-global"}, {"id": "genesis-r1", "name": "R1", "url": "https://genesis-r1.onrender.com", "health": "/api/health", "role": "spoke", "repo": "vaskesdot/genesis-r1"}, {"id": "genesis-rusfic", "name": "Rusfic", "url": "https://genesis-rusfic.onrender.com", "health": "/api/health", "role": "spoke", "repo": "vaskesdot/genesis-rusfic"}, {"id": "genesis-intelligence-core", "name": "Intelligence Core", "url": "https://genesis-intelligence-core.onrender.com", "health": "/", "role": "spoke", "repo": "vaskesdot/genesis-intelligence-core"}, {"id": "pharma-tower", "name": "Pharma Tower", "url": "https://pharma-tower.onrender.com", "health": "/health", "role": "spoke", "repo": "vaskesdot/pharma-tower-genesis"}, {"id": "vkiv", "name": "VKIV", "url": "https://vkiv.onrender.com", "health": "/health", "role": "spoke", "repo": "vaskesdot/vkiv"}, {"id": "moscow-iii", "name": "Moscow III", "url": "https://moscow-iii.onrender.com", "health": "/api/health", "role": "spoke", "repo": "vaskesdot/moscow-iii"}, {"id": "genesis-v2", "name": "Genesis V2", "url": "https://genesis-v2-kijy.onrender.com", "health": "/", "role": "spoke", "repo": "vaskesdot/genesis-v2"}, {"id": "spyder", "name": "SPYDER", "url": "https://spyder-7he7.onrender.com", "health": "/", "role": "spoke", "repo": "vaskesdot/SPYDER"}];

  function currentHost() {
    try { return location.host.toLowerCase(); } catch (e) { return ""; }
  }

  function buildBar(services) {
    if (document.getElementById("genesis-nav-bar")) return;

    var here = currentHost();
    var collapsed = localStorage.getItem(LS_KEY) === "1";

    var css = ""
      + "#genesis-nav-bar{position:fixed;left:0;right:0;bottom:0;z-index:2147483647;"
      + "font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:12px;"
      + "background:linear-gradient(90deg,#0a0e1a,#111a2e);color:#cfe3ff;"
      + "border-top:1px solid #2a3a5a;box-shadow:0 -2px 14px rgba(0,0,0,.45);"
      + "transition:transform .25s ease;}"
      + "#genesis-nav-bar.gn-collapsed{transform:translateY(calc(100% - 26px));}"
      + "#genesis-nav-head{display:flex;align-items:center;gap:8px;height:26px;padding:0 10px;cursor:pointer;"
      + "background:rgba(255,255,255,.04);user-select:none;}"
      + "#genesis-nav-head b{color:#7fd1ff;letter-spacing:.5px;}"
      + "#genesis-nav-head .gn-dot{width:8px;height:8px;border-radius:50%;background:#39d98a;box-shadow:0 0 6px #39d98a;}"
      + "#genesis-nav-head .gn-toggle{margin-left:auto;color:#9fb6d6;}"
      + "#genesis-nav-list{display:flex;flex-wrap:wrap;gap:6px;padding:8px 10px;max-height:34vh;overflow:auto;}"
      + ".gn-item{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:6px;"
      + "text-decoration:none;color:#dbe9ff;background:#16203a;border:1px solid #26365c;white-space:nowrap;}"
      + ".gn-item:hover{background:#1f2c4d;border-color:#3a5085;}"
      + ".gn-item.gn-here{background:#1c3a2a;border-color:#2f7d54;color:#a8ffd0;}"
      + ".gn-item.gn-hub{border-color:#caa14a;color:#ffe6a6;}"
      + ".gn-badge{font-size:10px;opacity:.8;}";

    var style = document.createElement("style");
    style.id = "genesis-nav-style";
    style.textContent = css;
    document.head.appendChild(style);

    var bar = document.createElement("div");
    bar.id = "genesis-nav-bar";
    if (collapsed) bar.className = "gn-collapsed";

    var head = document.createElement("div");
    head.id = "genesis-nav-head";
    head.innerHTML = '<span class="gn-dot"></span><b>GENESIS · SPIDER NAV</b>'
      + '<span class="gn-badge" style="opacity:.6">' + services.length + ' organs</span>'
      + '<span class="gn-toggle">' + (collapsed ? "▲ показать" : "▼ скрыть") + '</span>';
    head.addEventListener("click", function () {
      var isC = bar.classList.toggle("gn-collapsed");
      localStorage.setItem(LS_KEY, isC ? "1" : "0");
      head.querySelector(".gn-toggle").textContent = isC ? "▲ показать" : "▼ скрыть";
    });

    var list = document.createElement("div");
    list.id = "genesis-nav-list";

    services.forEach(function (s) {
      var a = document.createElement("a");
      a.className = "gn-item";
      var host = "";
      try { host = new URL(s.url).host.toLowerCase(); } catch (e) {}
      if (host && host === here) a.className += " gn-here";
      if (s.role === "hub") a.className += " gn-hub";
      a.href = s.url + "/";
      a.title = s.url;
      a.innerHTML = (s.role === "hub" ? "★ " : "") + (s.name || s.id)
        + (host === here ? ' <span class="gn-badge">(здесь)</span>' : "");
      list.appendChild(a);
    });

    bar.appendChild(head);
    bar.appendChild(list);
    (document.body || document.documentElement).appendChild(bar);
  }

  function loadRegistry() {
    var ctrl = (window.AbortController) ? new AbortController() : null;
    var to = ctrl ? setTimeout(function () { ctrl.abort(); }, 4000) : null;
    fetch(HUB + REGISTRY_PATH, { signal: ctrl ? ctrl.signal : undefined, mode: "cors" })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (data) {
        if (to) clearTimeout(to);
        var svc = (data && data.services) ? data.services : data;
        if (Array.isArray(svc) && svc.length) buildBar(svc);
        else buildBar(FALLBACK);
      })
      .catch(function () { if (to) clearTimeout(to); buildBar(FALLBACK); });
  }

  function start() { try { loadRegistry(); } catch (e) { try { buildBar(FALLBACK); } catch (e2) {} } }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else { start(); }
})();
