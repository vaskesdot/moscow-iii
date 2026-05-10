/* ─────────────────────────────────────────────────────────────────────────
   MOSCOW III — АКТЁРЫ НА ПАНОРАМЕ (стиль «Готика 2», 2002 г.)
   Низкополигональные русские прохожие поверх Yandex Street View.
   Чисто CSS+SVG, без картинок и без LLM.
   API: window.MoscowActors.populate(nodeId)  /  clear()
   ───────────────────────────────────────────────────────────────────────── */

window.MoscowActors = (function () {
  'use strict';

  const layer = document.getElementById('pano-actors');
  if (!layer) {
    console.warn('[actors] layer not found');
    return { populate(){}, clear(){} };
  }

  // ─── ТИПАЖИ (русские из 2000-х, юмор-комикс) ───
  // Поза/тело одинаковая, меняем оттенки одежды + кепка/без кепки + реплику.
  const ARCHETYPES = [
    { id: 'gopnik',    name: 'ГОПНИК',     hat: 'cap',   tracksuit: true,  jacket: '#1f2a4a', pants: '#222',     skin: '#e6b89c', hair: '#1a1a1a',
      lines: ['Слышь, э…','Семки есть?','Ты с какого района?','Чё кого, братан?','Опа-опа, давай покурим'] },
    { id: 'baba',      name: 'ТЁТЯ КЛАВА', hat: 'scarf', tracksuit: false, jacket: '#7a1f4a', pants: '#3a3a3a', skin: '#e8c4a0', hair: '#a04a3a',
      lines: ['Ходють тут всякие…','Опять натоптал!','Молодёжь нынче…','Купи лучше бабе цветочки'] },
    { id: 'dyadya',    name: 'ДЯДЯ ВОВА',  hat: 'none',  tracksuit: false, jacket: '#2a4a2a', pants: '#1a2a1a', skin: '#d9a07f', hair: '#8a6a4a',
      lines: ['В наше время…','Эх, молодость','Сын, не балуй','Газету не видел?'] },
    { id: 'shkolnik',  name: 'ШКОЛЯР',     hat: 'none',  tracksuit: true,  jacket: '#7a1f1f', pants: '#1f1f3a', skin: '#f0c8a8', hair: '#3a2a14',
      lines: ['Можно списать?','Я физру прогулял','Айфон есть?','Слышь, дай позвонить'] },
    { id: 'ded',       name: 'ДЕД',        hat: 'cap',   tracksuit: false, jacket: '#3a3a4a', pants: '#2a2a2a', skin: '#d8b89c', hair: '#cccccc',
      lines: ['Раньше тут речка была…','Внучок, помоги','Где сельпо, не подскажешь?','Ох, ноги не те'] },
    { id: 'pacanka',   name: 'НАСТЁНА',    hat: 'none',  tracksuit: true,  jacket: '#c83a7a', pants: '#222',    skin: '#f0c8a8', hair: '#d4a04a',
      lines: ['Чё уставился?','Я уже занята, прости','Купи мне сок','Ты местный, что ли?'] },
    { id: 'rabotyaga', name: 'МУЖИК',      hat: 'cap',   tracksuit: false, jacket: '#5a3a1a', pants: '#3a2a14', skin: '#caa07f', hair: '#3a2014',
      lines: ['Ну чё, помогаешь?','Закурить будет?','Тут шабашка одна…','Слесарь нужен?'] },
    { id: 'taxist',    name: 'ТАКСИСТ',    hat: 'none',  tracksuit: false, jacket: '#1a1a1a', pants: '#1a1a1a', skin: '#d4a890', hair: '#1a1a1a',
      lines: ['Поехали, командир!','До Истры — тыща','Шеф, садись','Знаю короткую дорогу'] },
  ];

  // ─── РАСПОЛОЖЕНИЕ АКТЁРОВ ПО ТОЧКАМ ───
  // Чтобы было разнообразие — каждой точке выдаём 1-3 типажа по детерминированному
  // hash-у id (без random, чтоб при возврате те же стояли).
  function pickActors(nodeId) {
    let h = 0;
    for (let i = 0; i < nodeId.length; i++) h = (h * 31 + nodeId.charCodeAt(i)) | 0;
    h = Math.abs(h);
    const count = 1 + (h % 3); // 1..3
    const picked = [];
    for (let i = 0; i < count; i++) {
      const idx = (h + i * 7) % ARCHETYPES.length;
      picked.push({
        ...ARCHETYPES[idx],
        // позиция на экране в %: разносим по горизонтали, низ панорамы
        x: 12 + (i * 32) + ((h + i * 11) % 14), // 12..72% — равномернее
        y: 58 + ((h + i * 31) % 22),  // 58..80%
        scale: 0.85 + (((h + i * 17) % 30) / 100), // 0.85..1.15
        flip: ((h + i) & 1) === 0,
        line: ARCHETYPES[idx].lines[(h + i) % ARCHETYPES[idx].lines.length],
      });
    }
    return picked;
  }

  // ─── ОТРИСОВКА ОДНОГО АКТЁРА ───
  // Низкополигональный человечек: голова + торс + руки + ноги + (опц.) кепка/платок.
  // Всё CSS-блоки с мягкой штриховой тенью «как в Готике».
  function actorHTML(a) {
    const hat =
      a.hat === 'cap' ?
        `<div class="ac-cap" style="background:${a.jacket}"></div>
         <div class="ac-cap-visor"></div>` :
      a.hat === 'scarf' ?
        `<div class="ac-scarf" style="background:${a.jacket}"></div>` :
        '';
    return `
      <div class="actor ${a.tracksuit ? 'is-track' : ''}" style="
        left:${a.x}%; bottom:${100 - a.y}%;
        --ac-jacket:${a.jacket};
        --ac-pants:${a.pants};
        --ac-skin:${a.skin};
        --ac-hair:${a.hair};
        transform: translateX(-50%) scale(${a.scale}) ${a.flip ? 'scaleX(-1)' : ''};
      ">
        <div class="actor-bubble" data-flip="${a.flip ? 1 : 0}">
          <div class="actor-bubble-name">${a.name}</div>
          <div class="actor-bubble-text">${a.line}</div>
        </div>
        <div class="actor-body">
          <div class="ac-head">
            <div class="ac-hair" style="background:${a.hair}"></div>
            ${hat}
            <div class="ac-eye ac-eye-l"></div>
            <div class="ac-eye ac-eye-r"></div>
            <div class="ac-mouth"></div>
          </div>
          <div class="ac-torso">
            <div class="ac-arm ac-arm-l"></div>
            <div class="ac-arm ac-arm-r"></div>
            ${a.tracksuit ? '<div class="ac-stripe ac-stripe-l"></div><div class="ac-stripe ac-stripe-r"></div>' : ''}
          </div>
          <div class="ac-legs">
            <div class="ac-leg ac-leg-l"></div>
            <div class="ac-leg ac-leg-r"></div>
          </div>
          <div class="ac-shadow"></div>
        </div>
      </div>`;
  }

  function populate(nodeId) {
    if (!nodeId) { layer.innerHTML = ''; return; }
    const list = pickActors(nodeId);
    layer.innerHTML = list.map(actorHTML).join('');
  }

  function clear() { layer.innerHTML = ''; }

  return { populate, clear };
})();
