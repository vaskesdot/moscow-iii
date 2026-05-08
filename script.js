/* ============================================================
   MOSCOW III — навигация по меню + Web Audio звуки + клав/тач
   ============================================================ */

(function () {
  'use strict';

  // ────────────────────────────────────────────────────────────
  // Аудио: процедурные звуки через Web Audio API. Никаких файлов.
  // ────────────────────────────────────────────────────────────
  let audioCtx = null;
  let masterGain = null;
  const audio = {
    sfxVolume: 0.85,
    enabled: true,
    init() {
      if (audioCtx) return;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audioCtx = new Ctx();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = this.sfxVolume * 0.6;
      masterGain.connect(audioCtx.destination);
    },
    setVolume(v) {
      this.sfxVolume = v;
      if (masterGain) masterGain.gain.value = v * 0.6;
    },
    blip(freq = 220, duration = 0.06, type = 'square', vol = 0.4) {
      if (!audioCtx || !this.enabled) return;
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      const t = audioCtx.currentTime;
      g.gain.setValueAtTime(0.0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.connect(g).connect(masterGain);
      osc.start(t);
      osc.stop(t + duration + 0.02);
    },
    move() { this.blip(180, 0.04, 'square', 0.25); },
    select() {
      this.blip(330, 0.05, 'square', 0.35);
      setTimeout(() => this.blip(440, 0.07, 'square', 0.35), 35);
    },
    back() { this.blip(140, 0.07, 'sawtooth', 0.3); },
    error() { this.blip(120, 0.18, 'sawtooth', 0.35); },
    start() {
      this.blip(220, 0.08, 'square', 0.4);
      setTimeout(() => this.blip(330, 0.08, 'square', 0.4), 70);
      setTimeout(() => this.blip(440, 0.18, 'square', 0.4), 140);
    },
  };

  // ────────────────────────────────────────────────────────────
  // Управление экранами (state machine)
  // ────────────────────────────────────────────────────────────
  const screens = {
    boot: 'boot-screen',
    rage: 'rage-screen',
    title: 'title-screen',
    main: 'main-menu',
    'new-game': 'new-game-menu',
    continue: 'continue-menu',
    options: 'options-menu',
    stats: 'stats-menu',
    brief: 'brief-menu',
    multiplayer: 'multiplayer-menu',
    map: 'map-menu',
    pano: 'pano-screen',
    credits: 'credits-menu',
    quit: 'quit-menu',
    loading: 'loading-screen',
  };

  const history = [];
  let current = 'boot';

  function show(key) {
    Object.values(screens).forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('active');
    });
    const el = document.getElementById(screens[key]);
    if (el) el.classList.add('active');
    current = key;
    setupActiveScreen(key);
  }

  function navigate(key) {
    if (key === current) return;
    history.push(current);
    audio.select();
    show(key);
  }

  function back() {
    audio.back();
    if (current === 'pano') exitPanorama();
    if (history.length > 0) {
      const prev = history.pop();
      show(prev);
    } else {
      show('main');
    }
  }

  // ────────────────────────────────────────────────────────────
  // Boot последовательность
  // ────────────────────────────────────────────────────────────
  function bootSequence() {
    // boot bar fill
    requestAnimationFrame(() => {
      const fill = document.getElementById('boot-bar-fill');
      if (fill) fill.style.width = '100%';
    });

    setTimeout(() => show('rage'), 1700);
    setTimeout(() => show('title'), 3400);
  }

  // ────────────────────────────────────────────────────────────
  // Обработка hover/active в текущем меню
  // ────────────────────────────────────────────────────────────
  let activeIndex = 0;

  function getMenuItems(screenKey) {
    const screenEl = document.getElementById(screens[screenKey]);
    if (!screenEl) return [];
    return Array.from(screenEl.querySelectorAll('.menu-item'));
  }

  function setActive(index) {
    const items = getMenuItems(current);
    if (!items.length) return;
    items.forEach((it) => it.classList.remove('is-active'));
    activeIndex = ((index % items.length) + items.length) % items.length;
    items[activeIndex].classList.add('is-active');
    items[activeIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function moveActive(delta) {
    const items = getMenuItems(current);
    if (!items.length) return;
    audio.move();
    setActive(activeIndex + delta);
  }

  function activateCurrent() {
    const items = getMenuItems(current);
    const item = items[activeIndex];
    if (!item) return;
    handleItem(item);
  }

  function handleItem(item) {
    const target = item.getAttribute('data-target');
    const action = item.getAttribute('data-action');

    if (target) {
      navigate(target);
      return;
    }

    if (action === 'back') {
      back();
      return;
    }

    if (action && action.startsWith('start-')) {
      audio.start();
      startCampaign(item);
      return;
    }

    if (action && action.startsWith('load-')) {
      if (item.classList.contains('empty')) {
        audio.error();
        flash(item);
        return;
      }
      audio.start();
      startCampaign(item);
      return;
    }

    if (action === 'quit-yes') {
      audio.back();
      goodbye();
      return;
    }

    audio.select();
  }

  function flash(el) {
    el.style.transition = 'background 80ms';
    el.style.background = 'rgba(200, 50, 50, 0.4)';
    setTimeout(() => {
      el.style.background = '';
    }, 220);
  }

  function setupActiveScreen(key) {
    activeIndex = 0;
    const items = getMenuItems(key);
    if (items.length) setActive(0);

    // Автотач/клик-обработчики на пунктах
    items.forEach((it, idx) => {
      if (it.dataset.bound === '1') return;
      it.dataset.bound = '1';

      it.addEventListener('mouseenter', () => {
        if (activeIndex !== idx) {
          activeIndex = idx;
          items.forEach((x) => x.classList.remove('is-active'));
          it.classList.add('is-active');
          audio.move();
        }
      });

      it.addEventListener('click', (e) => {
        e.preventDefault();
        activeIndex = idx;
        handleItem(it);
      });
    });

    // Опции — особая логика
    if (key === 'options') setupOptionsHandlers();
    if (key === 'map') setupMap();
  }

  // ─────────────────────────────────────────────────────────────
  // КАРТА — Leaflet + Esri World Imagery
  // ─────────────────────────────────────────────────────────────
  let mapInstance = null;
  let mapClockTimer = null;

  // Координаты Покровского (сняты из видео пользователя, уточнены)
  const POKROVSKOE_CENTER = [55.8090, 37.0118];

  // Точки интереса — реальные места Истринского р-на
  const POI = {
    home:        { coord: [55.8090, 37.0118], color: '#f08522', symbol: '⌂', label: 'ПОКРОВСКОЕ — ДОМ',         desc: 'Деревня Покровское, г.о. Истра' },
    krasniy:     { coord: [55.8123, 36.9988], color: '#ededed', symbol: '⌂', label: 'КРАСНЫЙ ПОСЕЛОК',     desc: 'Соседний посёлок' },
    padikovo:    { coord: [55.8189, 36.9750], color: '#ededed', symbol: '⌂', label: 'ПАДИКОВО',                desc: 'Деревня Падиково' },
    voronino:    { coord: [55.7980, 37.0250], color: '#ededed', symbol: '⌂', label: 'ВОРОНИНО',                  desc: 'Соседняя деревня' },
    riga:        { coord: [55.8350, 36.9820], color: '#ff5e3a', symbol: 'M', label: 'НОВОРИЖСКОЕ Ш.',         desc: 'Выезд на Рижское шоссе' },
    snegiri:     { coord: [55.8340, 37.0470], color: '#ff5e3a', symbol: 'M', label: 'СНЕГИРИ',                   desc: 'Посёлок Снегири' },
    arhangelskoe:{ coord: [55.7867, 37.0732], color: '#3aa3ff', symbol: '$', label: 'АРХАНГЕЛЬСКОЕ',           desc: 'Усадьба Архангельское' },
    nahabino:    { coord: [55.8450, 37.0830], color: '#3aa3ff', symbol: '$', label: 'НАХАБИНО',                  desc: 'Город Нахабино' },
    istra:       { coord: [55.9070, 36.8580], color: '#d4a737', symbol: '★', label: 'ИСТРА',                       desc: 'Районный центр — г. Истра' },
    dedovsk:     { coord: [55.8700, 37.1130], color: '#d4a737', symbol: '★', label: 'ДЕДОВСК',                   desc: 'Город Дедовск' },
    nikoloy:     { coord: [55.8950, 36.7780], color: '#3aa3ff', symbol: '$', label: 'НОВО-ИЕРУСАЛИМСКИЙ', desc: 'Ново-Иерусалимский монастырь' },
    nevsky:      { coord: [55.8117, 37.0403], color: '#ffd24a', symbol: '✚', label: 'ЦЕРКОВЬ АЛ. НЕВСКОГО', desc: 'Храм Александра Невского — Княжье Озеро' },
  };

  function makePoiIcon(symbol, color) {
    return L.divIcon({
      className: 'gta-poi',
      html: `<div class="gta-poi-pin" style="--poi-color:${color}"><span>${symbol}</span></div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });
  }

  function setupMap() {
    // Часы
    if (!mapClockTimer) {
      const updateClock = () => {
        const d = new Date();
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        const el = document.getElementById('map-clock');
        if (el) el.textContent = `${hh}:${mm}`;
      };
      updateClock();
      mapClockTimer = setInterval(updateClock, 30000);
    }

    if (mapInstance) {
      // Перерисовать после возврата
      setTimeout(() => mapInstance.invalidateSize(), 60);
      return;
    }

    if (typeof L === 'undefined') {
      console.warn('Leaflet not loaded yet');
      return;
    }

    mapInstance = L.map('map-canvas', {
      center: POKROVSKOE_CENTER,
      zoom: 13,
      minZoom: 11,
      maxZoom: 18,
      zoomControl: true,
      attributionControl: false,
      maxBounds: [[55.72, 36.65], [55.97, 37.25]],
      maxBoundsViscosity: 0.7,
    });

    // Фотореалистичный спутник Esri World Imagery (бесплатный, без API ключа)
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19, crossOrigin: true }
    ).addTo(mapInstance);

    // Подписи улиц и деревень сверху (полупрозрачный слой)
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19, opacity: 0.85, crossOrigin: true }
    ).addTo(mapInstance);

    // Маркеры POI — клик открывает popup с кнопкой «ПОГРУЗИТЬСЯ»
    Object.entries(POI).forEach(([key, p]) => {
      const marker = L.marker(p.coord, { icon: makePoiIcon(p.symbol, p.color) }).addTo(mapInstance);
      const popupHtml = `
        <div class="poi-popup">
          <div class="poi-popup-title">${p.label}</div>
          <div class="poi-popup-desc">${p.desc || ''}</div>
          <button class="poi-popup-btn" data-loc="${key}">вход ▸ ПОГРУЗИТЬСЯ</button>
        </div>`;
      marker.bindPopup(popupHtml, { closeButton: true, className: 'gta-popup' });
      marker.on('click', () => {
        audio.select();
        mapInstance.flyTo(p.coord, Math.max(mapInstance.getZoom(), 15), { duration: 0.5 });
      });
    });

    // Обработчик кнопки в popup (делегированный)
    mapInstance.on('popupopen', (e) => {
      const btn = e.popup.getElement().querySelector('.poi-popup-btn');
      if (btn && !btn.dataset.bound) {
        btn.dataset.bound = '1';
        btn.addEventListener('click', () => {
          const k = btn.dataset.loc;
          enterPanorama(k);
        });
      }
    });

    // Клики по списку локаций — летим и открываем popup
    document.querySelectorAll('#map-legend .legend-list li').forEach((li) => {
      li.addEventListener('click', () => {
        const k = li.dataset.loc;
        if (POI[k]) {
          audio.select();
          mapInstance.flyTo(POI[k].coord, 16, { duration: 0.6 });
          setTimeout(() => {
            mapInstance.eachLayer((layer) => {
              if (layer instanceof L.Marker && layer.getLatLng().lat === POI[k].coord[0]) {
                layer.openPopup();
              }
            });
          }, 700);
        }
      });
    });

    // Сворачивание легенды
    const mapScreen = document.getElementById('map-menu');
    const closeBtn = document.getElementById('legend-close');
    const openBtn = document.getElementById('legend-open');
    const collapseLegend = () => {
      mapScreen.classList.add('legend-collapsed');
      audio.back();
      setTimeout(() => mapInstance && mapInstance.invalidateSize(), 50);
    };
    const expandLegend = () => {
      mapScreen.classList.remove('legend-collapsed');
      audio.select();
      setTimeout(() => mapInstance && mapInstance.invalidateSize(), 50);
    };
    if (closeBtn && !closeBtn.dataset.bound) {
      closeBtn.dataset.bound = '1';
      closeBtn.addEventListener('click', (e) => { e.stopPropagation(); collapseLegend(); });
    }
    if (openBtn && !openBtn.dataset.bound) {
      openBtn.dataset.bound = '1';
      openBtn.addEventListener('click', (e) => { e.stopPropagation(); expandLegend(); });
    }

    // На мобиле сворачиваем легенду по умолчанию
    if (window.matchMedia('(max-width: 768px)').matches) {
      mapScreen.classList.add('legend-collapsed');
    }

    // Перерисовка после первого показа (Leaflet требует размеры контейнера)
    setTimeout(() => mapInstance.invalidateSize(), 80);
  }

  // ─────────────────────────────────────────────────────────────
  // 360° ПАНОРАМА ЧЕРЕЗ YANDEX MAP-WIDGET
  // ─────────────────────────────────────────────────────────────
  function enterPanorama(key) {
    const p = POI[key];
    if (!p) return;
    audio.start();
    const titleEl = document.getElementById('pano-title');
    const descEl = document.getElementById('pano-desc');
    if (titleEl) titleEl.textContent = p.label;
    if (descEl) descEl.textContent = p.desc || 'Прогуляйся вокруг.';
    navigate('pano');
    // Стартуем 3D-мир после отрисовки экрана
    setTimeout(() => {
      if (window.MoscowWorld && window.MoscowWorld.enterWorld) {
        window.MoscowWorld.enterWorld(key, p.label);
      }
    }, 80);
  }

  function exitPanorama() {
    if (window.MoscowWorld && window.MoscowWorld.exitWorld) {
      window.MoscowWorld.exitWorld();
    }
  }

  // ────────────────────────────────────────────────────────────
  // Старт "кампании" — мок-загрузка
  // ────────────────────────────────────────────────────────────
  const tips = [
    'Совет: на ручник лучше не тормозить в гололёд.',
    'Совет: чёрная «семёрка» выглядит как обычная — на ней проще оторваться от ГАИ.',
    'Совет: жми CTRL чтобы пригнуться при стрельбе. Шучу. Игры ещё нет.',
    'Совет: лучшее радио на районе — РАДИО ХАОС 102.4.',
    'Совет: не паркуйся на газоне у Думы. Серьёзно.',
    'Совет: круглосуточный на Тверской работает круглосуточно.',
    'Совет: заправка дешевле на МКАДе, чем в центре.',
    'Совет: если босс зовёт ночью — это к деньгам или к проблемам. Чаще к второму.',
  ];

  function startCampaign(item) {
    const label = item.querySelector('.item-label');
    const slotName = item.querySelector('.slot-name');
    const missionEl = document.getElementById('loading-mission');
    const tipEl = document.getElementById('loading-tip');
    const fill = document.getElementById('loading-bar-fill');

    if (missionEl) {
      const text = label ? label.textContent : (slotName ? slotName.textContent : 'ПОЕХАЛИ');
      missionEl.textContent = text;
    }
    if (tipEl) {
      tipEl.textContent = tips[Math.floor(Math.random() * tips.length)];
    }
    if (fill) fill.style.width = '0%';

    show('loading');

    let progress = 0;
    const tick = () => {
      progress += 1.2 + Math.random() * 2.5;
      if (progress > 100) progress = 100;
      if (fill) fill.style.width = progress + '%';
      if (progress < 100) {
        setTimeout(tick, 80 + Math.random() * 120);
      } else {
        setTimeout(() => {
          alert('Демо: здесь начнётся игра.\nПока — это меню без самой игры.');
          show('main');
        }, 600);
      }
    };
    setTimeout(tick, 300);
  }

  function goodbye() {
    document.body.style.transition = 'opacity 600ms';
    document.body.style.opacity = '0';
    setTimeout(() => {
      document.body.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#f08522;font-family:Bebas Neue,sans-serif;font-size:24px;letter-spacing:0.3em;text-align:center;padding:20px;">УВИДИМСЯ В МОСКВЕ.<br><br><span style="color:#888;font-size:12px;letter-spacing:0.2em">обновите страницу чтобы вернуться</span></div>';
      document.body.style.opacity = '1';
    }, 700);
  }

  // ────────────────────────────────────────────────────────────
  // Опции: ползунки и переключатели
  // ────────────────────────────────────────────────────────────
  function setupOptionsHandlers() {
    const bars = document.querySelectorAll('#options-menu .option-bar');
    bars.forEach((bar) => {
      if (bar.dataset.bound === '1') return;
      bar.dataset.bound = '1';
      bar.addEventListener('click', (e) => {
        const rect = bar.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const fill = bar.querySelector('.bar-fill');
        if (fill) fill.style.width = (ratio * 100) + '%';
        const value = Math.round(ratio * 100);
        const key = bar.getAttribute('data-key');
        const valEl = document.querySelector(`.option-value[data-bind="${key}"]`);
        if (valEl) valEl.textContent = value;
        if (key === 'sfx') audio.setVolume(ratio);
        audio.move();
      });
    });

    const toggles = document.querySelectorAll('#options-menu .option-toggle-value');
    toggles.forEach((t) => {
      if (t.dataset.bound === '1') return;
      t.dataset.bound = '1';
      t.addEventListener('click', (e) => {
        e.stopPropagation();
        const on = t.getAttribute('data-on') === 'true';
        t.setAttribute('data-on', (!on).toString());
        t.textContent = !on ? 'ВКЛ' : 'ВЫКЛ';
        audio.move();
      });
    });
  }

  // ────────────────────────────────────────────────────────────
  // Клавиатура
  // ────────────────────────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    audio.init();

    if (current === 'title') {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') {
        navigate('main');
        e.preventDefault();
      }
      return;
    }

    if (['boot', 'rage', 'loading'].includes(current)) return;

    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      moveActive(-1);
    } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      e.preventDefault();
      moveActive(1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      activateCurrent();
    } else if (e.key === 'Escape' || e.key === 'Backspace') {
      e.preventDefault();
      if (current === 'main') navigate('quit');
      else back();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      // Опции — стрелки регулируют ползунок активного пункта
      if (current === 'options') {
        const items = getMenuItems('options');
        const it = items[activeIndex];
        if (!it) return;
        const bar = it.querySelector('.option-bar');
        const toggle = it.querySelector('.option-toggle-value');
        if (bar) {
          const fill = bar.querySelector('.bar-fill');
          let cur = parseFloat(fill.style.width) || 0;
          cur += e.key === 'ArrowRight' ? 5 : -5;
          cur = Math.max(0, Math.min(100, cur));
          fill.style.width = cur + '%';
          const key = bar.getAttribute('data-key');
          const valEl = document.querySelector(`.option-value[data-bind="${key}"]`);
          if (valEl) valEl.textContent = Math.round(cur);
          if (key === 'sfx') audio.setVolume(cur / 100);
          audio.move();
        } else if (toggle) {
          toggle.click();
        }
      }
    }
  });

  // ────────────────────────────────────────────────────────────
  // Title screen — клик/тап для входа в меню
  // ────────────────────────────────────────────────────────────
  document.addEventListener('click', () => audio.init(), { once: true });
  document.addEventListener('touchstart', () => audio.init(), { once: true });

  document.getElementById('title-screen').addEventListener('click', () => {
    if (current === 'title') {
      navigate('main');
    }
  });
  document.getElementById('title-screen').addEventListener('touchend', (e) => {
    if (current === 'title') {
      e.preventDefault();
      navigate('main');
    }
  });

  // Свайп-навигация на мобильных (вверх/вниз)
  let touchStartY = null;
  document.addEventListener('touchstart', (e) => {
    if (['boot', 'rage', 'title', 'loading'].includes(current)) return;
    if (e.touches.length === 1) touchStartY = e.touches[0].clientY;
  });
  document.addEventListener('touchend', (e) => {
    if (touchStartY === null) return;
    const endY = (e.changedTouches[0] || {}).clientY;
    if (endY === undefined) { touchStartY = null; return; }
    const dy = endY - touchStartY;
    if (Math.abs(dy) > 60) {
      if (dy > 0) moveActive(-1);
      else moveActive(1);
    }
    touchStartY = null;
  });

  // ────────────────────────────────────────────────────────────
  // Подсказка для мобильных при заходе на title
  // ────────────────────────────────────────────────────────────
  function maybeShowTouchHint() {
    if (!('ontouchstart' in window)) return;
    const hint = document.getElementById('touch-hint');
    if (!hint) return;
    hint.classList.remove('hidden');
    setTimeout(() => hint.classList.add('hidden'), 3500);
  }

  // ────────────────────────────────────────────────────────────
  // Старт
  // ────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    bootSequence();
    setTimeout(maybeShowTouchHint, 3500);
  });

  // Если DOM уже готов
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    bootSequence();
    setTimeout(maybeShowTouchHint, 3500);
  }
})();
