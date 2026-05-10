/* ─────────────────────────────────────────────────────────────────────────
   MOSCOW III — АКТЁРЫ, ПРИВЯЗАННЫЕ К МЕСТНОСТИ (стиль GTA IV)
   Каждому NPC задан компасный азимут (0°=север). Слой следит за yaw
   камеры через свой drag-сенсор. Уйдёшь на соседнюю точку — актёр
   остаётся на своей. Развернёшься — увидишь снова.
   API: window.MoscowActors.populate(nodeId) / clear()
   ───────────────────────────────────────────────────────────────────────── */

window.MoscowActors = (function () {
  'use strict';

  const layer = document.getElementById('pano-actors');
  if (!layer) return { populate(){}, clear(){} };

  // ─── ТИПАЖИ ───
  const A = [
    { name: 'ГОПНИК',     hat:'cap',   track:1, jacket:'#1f2a4a', pants:'#222',    skin:'#e6b89c', hair:'#1a1a1a', lines:['Семки есть?','Чё кого, братан?','Ты с какого района?'] },
    { name: 'ТЁТЯ КЛАВА', hat:'scarf', track:0, jacket:'#7a1f4a', pants:'#3a3a3a', skin:'#e8c4a0', hair:'#a04a3a', lines:['Ходють тут всякие…','Молодёжь нынче…'] },
    { name: 'ДЯДЯ ВОВА',  hat:'none',  track:0, jacket:'#2a4a2a', pants:'#1a2a1a', skin:'#d9a07f', hair:'#8a6a4a', lines:['В наше время…','Сын, не балуй'] },
    { name: 'ШКОЛЯР',     hat:'none',  track:1, jacket:'#7a1f1f', pants:'#1f1f3a', skin:'#f0c8a8', hair:'#3a2a14', lines:['Можно списать?','Дай позвонить'] },
    { name: 'ДЕД',        hat:'cap',   track:0, jacket:'#3a3a4a', pants:'#2a2a2a', skin:'#d8b89c', hair:'#cccccc', lines:['Раньше тут речка была…','Внучок, помоги'] },
    { name: 'НАСТЁНА',    hat:'none',  track:1, jacket:'#c83a7a', pants:'#222',    skin:'#f0c8a8', hair:'#d4a04a', lines:['Чё уставился?','Купи мне сок'] },
    { name: 'МУЖИК',      hat:'cap',   track:0, jacket:'#5a3a1a', pants:'#3a2a14', skin:'#caa07f', hair:'#3a2014', lines:['Закурить будет?','Слесарь нужен?'] },
    { name: 'ТАКСИСТ',    hat:'none',  track:0, jacket:'#1a1a1a', pants:'#1a1a1a', skin:'#d4a890', hair:'#1a1a1a', lines:['Поехали, командир!','До Истры — тыща'] },
  ];

  const FOV = 90;            // примерный обзор Yandex-панорамы
  let yaw = 0;               // компасный угол центра обзора (0°=север)
  let actors = [];           // [{archIdx, az, dist, lineIdx}]
  let nodeId = null;
  let raf = 0;

  // ─── РАСКЛАД АКТЁРОВ ПО ТОЧКЕ ───
  // Hash от nodeId → детерминированно: сколько, какие, на каких азимутах
  function pickFor(id) {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    h = Math.abs(h);
    const n = 2 + (h % 3);   // 2..4 актёра
    const out = [];
    for (let i = 0; i < n; i++) {
      const ai = (h + i * 7) % A.length;
      // равномерно по 360° + сдвиг
      const az = (i * (360 / n) + (h % 60)) % 360;
      const dist = 0.55 + (((h + i * 11) % 50) / 100); // 0.55..1.05 (доля «реального» масштаба)
      out.push({ ai, az, dist, li: (h + i) % A[ai].lines.length });
    }
    return out;
  }

  // ─── HTML ОДНОГО АКТЁРА ───
  function html(a) {
    const arch = A[a.ai];
    const hat =
      arch.hat === 'cap' ?
        `<div class="ac-cap" style="background:${arch.jacket}"></div><div class="ac-cap-visor"></div>` :
      arch.hat === 'scarf' ?
        `<div class="ac-scarf" style="background:${arch.jacket}"></div>` : '';
    const stripes = arch.track ? '<div class="ac-stripe ac-stripe-l"></div><div class="ac-stripe ac-stripe-r"></div>' : '';
    return `
      <div class="actor ${arch.track ? 'is-track' : ''}" data-az="${a.az}" data-dist="${a.dist}">
        <div class="actor-bubble">
          <div class="actor-bubble-name">${arch.name}</div>
          <div class="actor-bubble-text">${arch.lines[a.li]}</div>
        </div>
        <div class="actor-body" style="--ac-jacket:${arch.jacket};--ac-pants:${arch.pants};--ac-skin:${arch.skin};--ac-hair:${arch.hair};">
          <div class="ac-head">
            <div class="ac-hair" style="background:${arch.hair}"></div>
            ${hat}
            <div class="ac-eye ac-eye-l"></div><div class="ac-eye ac-eye-r"></div>
            <div class="ac-mouth"></div>
          </div>
          <div class="ac-torso">
            <div class="ac-arm ac-arm-l"></div><div class="ac-arm ac-arm-r"></div>
            ${stripes}
          </div>
          <div class="ac-legs">
            <div class="ac-leg ac-leg-l"></div><div class="ac-leg ac-leg-r"></div>
          </div>
          <div class="ac-shadow"></div>
        </div>
      </div>`;
  }

  // ─── ОБНОВЛЕНИЕ ПОЗИЦИЙ ПОД ТЕКУЩИЙ YAW ───
  // Для каждого актёра считаем угол относительно центра обзора (delta).
  // Если |delta| > FOV/2 + запас — он за кадром (display:none).
  // Иначе: x = 50% + (delta / (FOV/2)) * 50% → влево/вправо от центра.
  // Масштаб: ближе к центру и с большим dist → крупнее.
  function tick() {
    const els = layer.querySelectorAll('.actor');
    els.forEach((el) => {
      const az = +el.dataset.az;
      const dist = +el.dataset.dist;
      let delta = ((az - yaw + 540) % 360) - 180; // -180..180
      const halfFov = FOV / 2 + 8;
      if (Math.abs(delta) > halfFov) {
        el.style.display = 'none';
        return;
      }
      el.style.display = '';
      const xPct = 50 + (delta / (FOV / 2)) * 50;
      // эффект перспективы: крайние слегка наклонены, как в GTA IV billboarded
      const tilt = (delta / (FOV / 2)) * 6; // ±6°
      // вертикаль: слегка ниже середины (горизонт ~52%)
      const yPct = 38 + (1 - dist) * 8;     // выше горизонта (38..46) — персонаж «стоит на земле»
      const scale = (0.55 + dist * 0.55).toFixed(2); // 0.55..1.10
      el.style.left = xPct + '%';
      el.style.top  = yPct + '%';
      el.style.transform = `translate(-50%, 0) rotateY(${tilt}deg) scale(${scale})`;
      // лёгкий «z-order»: чем ближе по dist, тем выше
      el.style.zIndex = String(100 + Math.round(dist * 100));
    });
  }

  function loop() {
    tick();
    raf = requestAnimationFrame(loop);
  }

  // ─── DRAG-СЕНСОР ДЛЯ ВРАЩЕНИЯ ОБЗОРА ───
  // Прозрачный слой ловит pointer и крутит наш yaw.
  // Yandex-iframe в это же время сам меняет вид при перетаскивании,
  // т. к. событие проходит на iframe (наш слой pointer-events:none),
  // но сам сенсор включаем только для доли вверху панорамы — там
  // мы хотим перехват. Лучше: глобальный listener на pano-screen
  // в capture-фазе, окно === iframe — Yandex всё равно крутит свой,
  // мы — свой. Они визуально совпадают, главное соотношение скорости.
  function attachYawTracker() {
    const pano = document.getElementById('pano-screen');
    if (!pano || pano._yawAttached) return;
    pano._yawAttached = true;

    let dragging = false, lastX = 0;
    const SPEED = 0.25; // °/px — подобрано под Yandex-чувствительность

    const down = (e) => {
      const t = e.touches ? e.touches[0] : e;
      lastX = t.clientX;
      dragging = true;
    };
    const move = (e) => {
      if (!dragging) return;
      const t = e.touches ? e.touches[0] : e;
      const dx = t.clientX - lastX;
      lastX = t.clientX;
      yaw = (yaw - dx * SPEED + 360) % 360;
    };
    const up = () => { dragging = false; };

    // window-level listeners (capture не нужен — iframe всё равно ловит своё)
    window.addEventListener('mousedown',  down, true);
    window.addEventListener('mousemove',  move, true);
    window.addEventListener('mouseup',    up,   true);
    window.addEventListener('touchstart', down, { passive: true, capture: true });
    window.addEventListener('touchmove',  move, { passive: true, capture: true });
    window.addEventListener('touchend',   up,   true);
  }

  // ─── ПУБЛИЧНЫЙ API ───
  function populate(id) {
    nodeId = id;
    actors = pickFor(id);
    // НЕ сбрасываем yaw — пользователь сохраняет ориентацию
    layer.innerHTML = actors.map(html).join('');
    attachYawTracker();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  function clear() {
    cancelAnimationFrame(raf); raf = 0;
    layer.innerHTML = '';
    actors = [];
    nodeId = null;
  }

  return { populate, clear, _setYaw: (v) => { yaw = v; }, _getYaw: () => yaw };
})();
