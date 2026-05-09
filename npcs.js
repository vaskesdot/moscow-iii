/* ─────────────────────────────────────────────────────────────────────────
   MOSCOW III — NPC «ПАЦАНЫ» НА КАРТЕ
   Мультяшные персонажи в духе GTA 3 + диалоги-миссии.
   Без сторонних картинок: аватарка собирается чистым CSS-блоком.
   API: window.MoscowNPC.attachToMap(L, mapInstance)
   ───────────────────────────────────────────────────────────────────────── */

window.MoscowNPC = (function () {
  'use strict';

  // ─── ПЕРСОНАЖИ ───
  // skin/hair/shirt — базовые цвета для CSS-аватара (var(--npc-*)).
  // accent — цвет рамки/ауры на карте.
  // dialog — массив реплик; в каждой can be reply ИЛИ choices с next-индексами.
  //   speaker: 'npc' | 'me'
  //   choices: [{ text, next, action? }]   action: 'accept' | 'decline' | 'end'
  const NPCS = {
    seriy: {
      name: 'СЕРЫЙ',
      nick: 'Покровский',
      coord: [55.8088, 37.0125], // у дома
      target: 'krasniy_n',
      mission: 'СГОНЯТЬ В КРАСНЫЙ ПОСЁЛОК',
      skin: '#e6b89c', hair: '#2a1a14', shirt: '#1f6f3a', accent: '#ffd24a',
      dialog: [
        { speaker: 'npc', text: 'Слышь, братишка. Ты местный, я тебя видел.' },
        { speaker: 'npc', text: 'Дело короткое. Сгоняешь до Красного — там пацан с ключами ждёт. Возьмёшь у него — занесёшь.' },
        { speaker: 'me',  choices: [
          { text: 'Без вопросов. Где встаём?', next: 3, action: 'accept' },
          { text: 'Сегодня не катит, брат.', next: 4, action: 'decline' },
        ]},
        { speaker: 'npc', text: 'Чёткий. На севере Красного, у выезда к шоссе. Метку поставил — двигай.', end: true },
        { speaker: 'npc', text: 'Ладно, пусть ноги отдыхают. Будут силы — найдёшь меня тут.', end: true },
      ],
    },

    tolyan: {
      name: 'ТОЛЯН',
      nick: 'Княжий',
      coord: [55.8125, 37.0395], // у церкви
      target: 'nikoloy',
      mission: 'СВЕЧКА В НОВО-ИЕРУСАЛИМ',
      skin: '#dcb091', hair: '#5a3920', shirt: '#7a1f1f', accent: '#ff5e3a',
      dialog: [
        { speaker: 'npc', text: 'О, здарова. Ты к храму? Удачно зашёл.' },
        { speaker: 'npc', text: 'Тут такое — батя просил свечку поставить в Ново-Иерусалимском. Сам занят, не доеду.' },
        { speaker: 'npc', text: 'Сделаешь — вернёшься, я в долгу не останусь. Зуб даю.' },
        { speaker: 'me',  choices: [
          { text: 'Поехали, без базара.', next: 4, action: 'accept' },
          { text: 'Дела другие, в другой раз.', next: 5, action: 'decline' },
        ]},
        { speaker: 'npc', text: 'Уважение. Метка на монастыре. Возвращайся живым.', end: true },
        { speaker: 'npc', text: 'Понял-принял. Не пропадай.', end: true },
      ],
    },

    vityok: {
      name: 'ВИТЁК',
      nick: 'Снегирёвский',
      coord: [55.8345, 37.0455], // Снегири
      target: 'dedovsk',
      mission: 'ПЕРЕТЕРЕТЬ В ДЕДОВСКЕ',
      skin: '#e0a988', hair: '#1a1a1a', shirt: '#1f2a4a', accent: '#3aa3ff',
      dialog: [
        { speaker: 'npc', text: 'Эй, ты чего у памятника завис? Не из ментов?' },
        { speaker: 'me',  choices: [
          { text: 'Свой я, свой.', next: 2 },
          { text: 'А тебе какое дело?', next: 6, action: 'end' },
        ]},
        { speaker: 'npc', text: 'Тогда слушай. В Дедовске пацаны мутят, надо подъехать перетереть.' },
        { speaker: 'npc', text: 'Без шума, без пыли. Просто покажешься — и обратно.' },
        { speaker: 'me',  choices: [
          { text: 'Понял. Метку давай.', next: 5, action: 'accept' },
          { text: 'Не моя тема, брат.', next: 7, action: 'decline' },
        ]},
        { speaker: 'npc', text: 'Чётко. Дедовск, центр. Жду новостей.', end: true },
        { speaker: 'npc', text: 'Иди-иди, дальше не задерживай.', end: true },
        { speaker: 'npc', text: 'Понял-принял. Бывай.', end: true },
      ],
    },

    rom: {
      name: 'РОМЫЧ',
      nick: 'Истринский',
      coord: [55.9075, 36.8595], // Истра
      target: 'arhangel',
      mission: 'ПОДЪЕХАТЬ В АРХАНГЕЛЬСКОЕ',
      skin: '#d9a07f', hair: '#3a2014', shirt: '#3a3a3a', accent: '#ff5e3a',
      dialog: [
        { speaker: 'npc', text: 'Слышь, ты вовремя. У меня тачка села, а в Архангельском дело стоит.' },
        { speaker: 'npc', text: 'Усадьба, парк, всё дела. Подъехать просто нужно — отметишься, я в курсе буду.' },
        { speaker: 'me',  choices: [
          { text: 'Не вопрос, гоню.', next: 3, action: 'accept' },
          { text: 'Сейчас не могу.', next: 4, action: 'decline' },
        ]},
        { speaker: 'npc', text: 'Зачёт. Метка на усадьбе — Архангельское. Двигай.', end: true },
        { speaker: 'npc', text: 'Ну ладно, понял.', end: true },
      ],
    },

    den: {
      name: 'ДЕНЧИК',
      nick: 'Падиковский',
      coord: [55.8195, 36.9755], // Падиково
      target: 'voronino',
      mission: 'ЗАЕХАТЬ В ВОРОНИНО',
      skin: '#e8b89c', hair: '#6a4a2a', shirt: '#0e3a1f', accent: '#ffd24a',
      dialog: [
        { speaker: 'npc', text: 'О, новое лицо в Падиково. Ты по делу или просто катаешься?' },
        { speaker: 'me',  choices: [
          { text: 'По делу, по делу.', next: 2 },
          { text: 'Просто гуляю.', next: 5, action: 'end' },
        ]},
        { speaker: 'npc', text: 'Тогда есть тема. В Воронино надо посмотреть, что там как — давно не появлялся никто наш.' },
        { speaker: 'me',  choices: [
          { text: 'Проедусь, посмотрю.', next: 4, action: 'accept' },
          { text: 'В другой раз.', next: 6, action: 'decline' },
        ]},
        { speaker: 'npc', text: 'Чётко. Метка на Воронино. Возвращайся с новостями.', end: true },
        { speaker: 'npc', text: 'Ну гуляй тогда. Места у нас неплохие.', end: true },
        { speaker: 'npc', text: 'Окей, как скажешь.', end: true },
      ],
    },
  };

  // ─── ВНУТРЕННЕЕ ───
  let mapRef = null;
  let LRef = null;
  let dialogModal = null;
  let activeMissions = {};      // npcId -> { target }
  const targetMarkers = {};     // npcId -> Leaflet marker

  // Аватар-портрет — чистый CSS-блок (для маркера и для модалки)
  function avatarHTML(npc, size) {
    const s = size || 36;
    const pad = Math.round(s * 0.05);
    return `
      <div class="npc-avatar" style="
        --npc-skin:${npc.skin};
        --npc-hair:${npc.hair};
        --npc-shirt:${npc.shirt};
        --npc-accent:${npc.accent};
        width:${s}px;height:${s}px;padding:${pad}px;">
        <div class="npc-av-hair"></div>
        <div class="npc-av-face"></div>
        <div class="npc-av-eye npc-av-eye-l"></div>
        <div class="npc-av-eye npc-av-eye-r"></div>
        <div class="npc-av-mouth"></div>
        <div class="npc-av-shirt"></div>
        <div class="npc-av-collar"></div>
      </div>`;
  }

  function makeNpcMarker(npc, key) {
    const html = `
      <div class="npc-pin" style="--npc-accent:${npc.accent};">
        <div class="npc-pin-aura"></div>
        ${avatarHTML(npc, 44)}
        <div class="npc-pin-mark">!</div>
      </div>`;
    return LRef.divIcon({
      className: 'npc-icon',
      html,
      iconSize: [56, 64],
      iconAnchor: [28, 56],
    });
  }

  // ─── МОДАЛКА ДИАЛОГА ───
  function ensureModal() {
    if (dialogModal) return dialogModal;
    dialogModal = document.createElement('div');
    dialogModal.id = 'npc-dialog';
    dialogModal.className = 'npc-dialog hidden';
    dialogModal.innerHTML = `
      <div class="npc-dialog-backdrop"></div>
      <div class="npc-dialog-box">
        <div class="npc-dialog-portrait" id="npc-dialog-portrait"></div>
        <div class="npc-dialog-body">
          <div class="npc-dialog-name" id="npc-dialog-name"></div>
          <div class="npc-dialog-text" id="npc-dialog-text"></div>
          <div class="npc-dialog-choices" id="npc-dialog-choices"></div>
        </div>
        <button class="npc-dialog-close" id="npc-dialog-close" aria-label="Закрыть">×</button>
      </div>`;
    document.body.appendChild(dialogModal);
    dialogModal.querySelector('#npc-dialog-close').addEventListener('click', closeDialog);
    dialogModal.querySelector('.npc-dialog-backdrop').addEventListener('click', closeDialog);
    return dialogModal;
  }

  function closeDialog() {
    if (!dialogModal) return;
    dialogModal.classList.add('hidden');
  }

  function openDialog(npcId) {
    const npc = NPCS[npcId];
    if (!npc) return;
    ensureModal();
    dialogModal.classList.remove('hidden');
    const portrait = dialogModal.querySelector('#npc-dialog-portrait');
    portrait.innerHTML = avatarHTML(npc, 130);
    dialogModal.querySelector('#npc-dialog-name').textContent =
      npc.name + ' · ' + npc.nick.toUpperCase();
    showLine(npcId, 0);
  }

  function showLine(npcId, idx) {
    const npc = NPCS[npcId];
    const line = npc.dialog[idx];
    if (!line) { closeDialog(); return; }

    const txtEl = dialogModal.querySelector('#npc-dialog-text');
    const choicesEl = dialogModal.querySelector('#npc-dialog-choices');
    choicesEl.innerHTML = '';

    if (line.choices) {
      // Реплика игрока — варианты ответа
      txtEl.textContent = '— ВЫБЕРИ ОТВЕТ —';
      txtEl.classList.add('npc-dialog-text-me');
      line.choices.forEach((ch) => {
        const btn = document.createElement('button');
        btn.className = 'npc-choice';
        btn.textContent = '> ' + ch.text;
        btn.addEventListener('click', () => {
          if (ch.action === 'accept') acceptMission(npcId);
          if (ch.action === 'decline') declineMission(npcId);
          if (ch.action === 'end') { closeDialog(); return; }
          showLine(npcId, ch.next);
        });
        choicesEl.appendChild(btn);
      });
    } else {
      // Реплика NPC
      txtEl.classList.remove('npc-dialog-text-me');
      txtEl.textContent = line.text;
      const btn = document.createElement('button');
      btn.className = 'npc-choice npc-choice-next';
      btn.textContent = line.end ? 'ЗАКРЫТЬ' : 'ДАЛЬШЕ ▸';
      btn.addEventListener('click', () => {
        if (line.end) { closeDialog(); return; }
        showLine(npcId, idx + 1);
      });
      choicesEl.appendChild(btn);
    }
  }

  // ─── МИССИИ ───
  function acceptMission(npcId) {
    const npc = NPCS[npcId];
    activeMissions[npcId] = { target: npc.target };
    placeTargetMarker(npcId);
  }

  function declineMission(npcId) {
    delete activeMissions[npcId];
    if (targetMarkers[npcId]) {
      mapRef.removeLayer(targetMarkers[npcId]);
      delete targetMarkers[npcId];
    }
  }

  function placeTargetMarker(npcId) {
    const npc = NPCS[npcId];
    // Берём координаты из MoscowGraph (если есть waypoint)
    let coord = null;
    if (window.MoscowGraph && window.MoscowGraph.get(npc.target)) {
      coord = window.MoscowGraph.get(npc.target).coord;
    }
    if (!coord) return;

    if (targetMarkers[npcId]) {
      mapRef.removeLayer(targetMarkers[npcId]);
    }
    const icon = LRef.divIcon({
      className: 'mission-target-icon',
      html: `
        <div class="mission-target" style="--npc-accent:${npc.accent};">
          <div class="mission-target-ring"></div>
          <div class="mission-target-label">${npc.mission}</div>
          <div class="mission-target-dot">GO</div>
        </div>`,
      iconSize: [180, 80],
      iconAnchor: [90, 70],
    });
    targetMarkers[npcId] = LRef.marker(coord, { icon, zIndexOffset: 1000 }).addTo(mapRef);
  }

  // ─── ПУБЛИЧНЫЙ API ───
  function attachToMap(L, map) {
    LRef = L;
    mapRef = map;
    Object.keys(NPCS).forEach((id) => {
      const npc = NPCS[id];
      const m = L.marker(npc.coord, { icon: makeNpcMarker(npc, id), zIndexOffset: 500 })
        .addTo(map);
      m.on('click', () => {
        // Подлетаем и открываем диалог
        map.flyTo(npc.coord, Math.max(map.getZoom(), 15), { duration: 0.4 });
        setTimeout(() => openDialog(id), 350);
      });
    });
  }

  return { attachToMap, NPCS };
})();
