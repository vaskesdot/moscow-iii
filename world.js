/* ─────────────────────────────────────────────────────────────────────────
   MOSCOW III — STREET-VIEW НАВИГАЦИЯ ПО ГРАФУ ВАЙПОИНТОВ
   Yandex-панорама как фон + GTA-стрелки «куда пойти» поверх iframe.
   API наружу: window.MoscowWorld.enterWorld(key, label) / exitWorld()
   ───────────────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  const G = window.MoscowGraph;
  if (!G) {
    console.error('[world] MoscowGraph not loaded');
    return;
  }

  const iframe   = document.getElementById('pano-iframe');
  const fadeEl   = document.getElementById('pano-fade');
  const titleEl  = document.getElementById('pano-title');
  const descEl   = document.getElementById('pano-desc');
  const arrowsEl = document.getElementById('nav-arrows');

  let currentNodeId = null;
  let isTransitioning = false;

  // ─── URL Yandex-панорамы ───
  // Используем map-widget v1: l=stv,sta включает слой Street View поверх
  // спутника, panorama[point] открывает ближайший снимок.
  function panoUrl(node) {
    const [lat, lng] = node.coord;
    const params = new URLSearchParams({
      ll: lng + ',' + lat,
      z: '18',
      l: 'stv,sta',
    });
    // panorama[*] нужно кодировать вручную (квадратные скобки)
    const pano =
      '&panorama%5Bpoint%5D=' + lng + ',' + lat +
      '&panorama%5Bdirection%5D=0,0' +
      '&panorama%5Bspan%5D=120,60';
    return 'https://yandex.ru/map-widget/v1/?' + params.toString() + pano;
  }

  // ─── HUD-стрелки ───
  // Размещение: 4 «слота» вокруг центра экрана (12, 3, 6, 9 часов).
  // Каждое exit раскладываем по азимуту: 0°→верх, 90°→право, 180°→низ, 270°→лево.
  function placeArrow(exit) {
    const dir = exit.dir;
    // Определяем зону: 4 квадранта
    let zone;
    if (dir >= 315 || dir < 45)        zone = 'top';
    else if (dir >= 45 && dir < 135)   zone = 'right';
    else if (dir >= 135 && dir < 225)  zone = 'bottom';
    else                               zone = 'left';
    return zone;
  }

  function renderArrows(node) {
    arrowsEl.innerHTML = '';
    if (!node || !node.exits || !node.exits.length) return;

    // Группируем по зонам, чтобы не накладывать стрелки друг на друга
    const zones = { top: [], right: [], bottom: [], left: [] };
    node.exits.forEach((ex) => {
      const z = placeArrow(ex);
      zones[z].push(ex);
    });

    Object.keys(zones).forEach((zoneName) => {
      const list = zones[zoneName];
      list.forEach((ex, i) => {
        const btn = document.createElement('button');
        btn.className = 'nav-arrow nav-arrow-' + zoneName;
        btn.dataset.to = ex.to;

        // Стрелка-символ зависит от зоны
        const sym = {
          top: '▲',
          right: '▶',
          bottom: '▼',
          left: '◀',
        }[zoneName];

        btn.innerHTML =
          '<span class="nav-arrow-symbol">' + sym + '</span>' +
          '<span class="nav-arrow-label">' + ex.shortLabel + '</span>' +
          '<span class="nav-arrow-dist">' + ex.dist + ' м</span>';

        // Если стрелок в одной зоне несколько — слегка раздвигаем
        if (list.length > 1) {
          const offset = (i - (list.length - 1) / 2) * 140;
          if (zoneName === 'top' || zoneName === 'bottom') {
            btn.style.transform = 'translateX(' + offset + 'px)';
          } else {
            btn.style.transform = 'translateY(' + offset + 'px)';
          }
        }

        btn.addEventListener('click', () => goTo(ex.to));
        arrowsEl.appendChild(btn);
      });
    });
  }

  // ─── Переход между точками ───
  function goTo(nodeId) {
    if (isTransitioning) return;
    const node = G.get(nodeId);
    if (!node) return;
    isTransitioning = true;

    // Затемнение
    fadeEl.classList.add('active');

    setTimeout(() => {
      currentNodeId = nodeId;
      iframe.src = panoUrl(node);
      titleEl.textContent = node.label;
      descEl.textContent = node.desc || '';
      renderArrows(node);

      // Плавно убираем затемнение
      setTimeout(() => {
        fadeEl.classList.remove('active');
        isTransitioning = false;
      }, 350);
    }, 300);
  }

  // ─── Публичный API ───
  function enterWorld(key, label) {
    const startId = G.resolveStart(key);
    const node = G.get(startId);
    if (!node) {
      console.error('[world] no node for', key);
      return;
    }
    currentNodeId = startId;
    iframe.src = panoUrl(node);
    titleEl.textContent = label || node.label;
    descEl.textContent = node.desc || '';
    renderArrows(node);
  }

  function exitWorld() {
    iframe.src = 'about:blank';
    arrowsEl.innerHTML = '';
    currentNodeId = null;
  }

  window.MoscowWorld = { enterWorld, exitWorld };
  console.log('[world] street-view ready, nodes:', Object.keys(G.nodes).length);
})();
