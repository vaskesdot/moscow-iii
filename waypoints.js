/* ─────────────────────────────────────────────────────────────────────────
   MOSCOW III — ГРАФ ВАЙПОИНТОВ ДЛЯ STREET-VIEW НАВИГАЦИИ
   Каждая точка = реальное место с координатами для Yandex-панорамы.
   exits = куда можно «пойти» из этой точки (с подписью для HUD-стрелки).
   dir = направление в градусах (0 = север, 90 = восток) — для расчёта
         поворота стрелки на экране.
   ───────────────────────────────────────────────────────────────────────── */

window.MoscowGraph = (function () {
  // Хелпер: рассчитать азимут (bearing) от точки A к B в градусах.
  // 0° = север, 90° = восток. Используется чтобы повернуть HUD-стрелку.
  function bearing(a, b) {
    const toRad = (d) => (d * Math.PI) / 180;
    const toDeg = (r) => (r * 180) / Math.PI;
    const φ1 = toRad(a[0]);
    const φ2 = toRad(b[0]);
    const Δλ = toRad(b[1] - a[1]);
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x =
      Math.cos(φ1) * Math.sin(φ2) -
      Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  }

  // ─── ВАЙПОИНТЫ ───
  // Сосредоточены вокруг Покровского / Княжьего Озера / Истры — реальные
  // координаты по карте, чтобы Яндекс-панорама находила ближайший снимок.
  const N = {
    // ── Покровское (дом) ──
    home:        { coord: [55.8090, 37.0118], label: 'ПОКРОВСКОЕ — ДОМ',  desc: 'Двор у дома' },
    pokr_road1:  { coord: [55.8098, 37.0150], label: 'УЛИЦА У ДОМА',       desc: 'Поворот на главную' },
    pokr_road2:  { coord: [55.8108, 37.0210], label: 'ВЫЕЗД ИЗ ПОКРОВСКОГО', desc: 'Перекрёсток' },
    pokr_field:  { coord: [55.8070, 37.0090], label: 'ПОЛЕ ЗА ДОМОМ',      desc: 'Тропа к лесу' },

    // ── Княжье Озеро / Церковь Александра Невского ──
    knyazhye_in: { coord: [55.8120, 37.0350], label: 'ВЪЕЗД В КНЯЖЬЕ ОЗЕРО', desc: 'Главные ворота' },
    nevsky:      { coord: [55.8117, 37.0403], label: 'ЦЕРКОВЬ АЛ. НЕВСКОГО', desc: 'Храм Александра Невского' },
    knyazhye_sq: { coord: [55.8132, 37.0420], label: 'ПЛОЩАДЬ У ХРАМА',    desc: 'Главная аллея' },
    knyazhye_e:  { coord: [55.8145, 37.0470], label: 'КНЯЖЬЕ — ВОСТОК',    desc: 'Тихая улица' },

    // ── Красный Посёлок ──
    krasniy:     { coord: [55.8123, 36.9988], label: 'КРАСНЫЙ ПОСЁЛОК',    desc: 'Центральная улица' },
    krasniy_n:   { coord: [55.8175, 36.9990], label: 'КРАСНЫЙ — СЕВЕР',    desc: 'Выезд к шоссе' },

    // ── Новорижское шоссе ──
    riga_24km:   { coord: [55.8170, 37.0050], label: 'НОВОРИЖСКОЕ — 24 КМ', desc: 'Развязка у Княжьего' },
    riga_w:      { coord: [55.8240, 36.9820], label: 'НОВОРИЖСКОЕ — ЗАПАД', desc: 'В сторону Падиково' },
    riga_e:      { coord: [55.8200, 37.0400], label: 'НОВОРИЖСКОЕ — ВОСТОК', desc: 'В сторону Снегирей' },

    // ── Падиково ──
    padikovo:    { coord: [55.8189, 36.9750], label: 'ПАДИКОВО',           desc: 'Музей техники' },
    padikovo_e:  { coord: [55.8195, 36.9810], label: 'ПАДИКОВО — ВЫЕЗД',   desc: 'К шоссе' },

    // ── Снегири ──
    snegiri:     { coord: [55.8340, 37.0470], label: 'СНЕГИРИ',            desc: 'Памятник 9-й Гвардейской' },
    snegiri_s:   { coord: [55.8290, 37.0440], label: 'СНЕГИРИ — ЮГ',       desc: 'К Новой Риге' },

    // ── Дедовск ──
    dedovsk:     { coord: [55.8700, 37.1130], label: 'ДЕДОВСК',            desc: 'Центр' },

    // ── Нахабино ──
    nahabino:    { coord: [55.8450, 37.0830], label: 'НАХАБИНО',           desc: 'Станция' },

    // ── Воронино ──
    voronino:    { coord: [55.7980, 37.0250], label: 'ВОРОНИНО',           desc: 'Деревня к югу' },

    // ── Архангельское ──
    arhangel:    { coord: [55.7867, 37.0732], label: 'АРХАНГЕЛЬСКОЕ',      desc: 'Усадьба Юсуповых' },

    // ── Истра ──
    istra:       { coord: [55.9070, 36.8580], label: 'ИСТРА',              desc: 'Город Истра' },
    istra_s:     { coord: [55.8800, 36.8800], label: 'ИСТРА — ЮГ',         desc: 'Подъезд от Нового Иерусалима' },

    // ── Ново-Иерусалимский монастырь ──
    nikoloy:     { coord: [55.9220, 36.8430], label: 'НОВО-ИЕРУСАЛИМ',    desc: 'Воскресенский монастырь' },
  };

  // ─── РЁБРА ───
  // Для каждой точки — список соседей. Подпись формируется автоматически
  // как «К <LABEL>», но можно переопределить через 3-й элемент.
  const EDGES = {
    home:        ['pokr_road1', 'pokr_field'],
    pokr_road1:  ['home', 'pokr_road2'],
    pokr_road2:  ['pokr_road1', 'knyazhye_in', 'krasniy', 'voronino'],
    pokr_field:  ['home'],

    knyazhye_in: ['pokr_road2', 'nevsky', 'riga_24km'],
    nevsky:      ['knyazhye_in', 'knyazhye_sq'],
    knyazhye_sq: ['nevsky', 'knyazhye_e'],
    knyazhye_e:  ['knyazhye_sq', 'riga_e'],

    krasniy:     ['pokr_road2', 'krasniy_n'],
    krasniy_n:   ['krasniy', 'riga_24km'],

    riga_24km:   ['knyazhye_in', 'krasniy_n', 'riga_w', 'riga_e'],
    riga_w:      ['riga_24km', 'padikovo_e'],
    riga_e:      ['riga_24km', 'knyazhye_e', 'snegiri_s'],

    padikovo_e:  ['riga_w', 'padikovo'],
    padikovo:    ['padikovo_e'],

    snegiri_s:   ['riga_e', 'snegiri', 'nahabino'],
    snegiri:     ['snegiri_s', 'dedovsk'],

    dedovsk:     ['snegiri', 'nahabino'],
    nahabino:    ['snegiri_s', 'dedovsk', 'arhangel'],

    voronino:    ['pokr_road2', 'arhangel'],
    arhangel:    ['voronino', 'nahabino'],

    istra:       ['istra_s', 'nikoloy'],
    istra_s:     ['istra', 'snegiri'],
    nikoloy:     ['istra'],
  };

  // ─── СБОРКА ГРАФА ───
  // Каждой точке добавляем exits[] с rich-объектами {to, label, dir, dist}.
  Object.keys(N).forEach((id) => {
    const me = N[id];
    me.id = id;
    const neigh = EDGES[id] || [];
    me.exits = neigh.map((toId) => {
      const target = N[toId];
      const dir = bearing(me.coord, target.coord);
      // расстояние в метрах (грубо)
      const Δlat = (target.coord[0] - me.coord[0]) * 111320;
      const Δlng =
        (target.coord[1] - me.coord[1]) *
        111320 *
        Math.cos((me.coord[0] * Math.PI) / 180);
      const dist = Math.round(Math.sqrt(Δlat * Δlat + Δlng * Δlng));
      return {
        to: toId,
        label: 'К ' + (target.label || toId.toUpperCase()),
        shortLabel: target.label || toId.toUpperCase(),
        dir,
        dist,
      };
    });
  });

  // Связываем алиасы старых POI-ключей со стартовыми вайпоинтами,
  // чтобы старая `enterPanorama(key)` продолжала работать.
  const POI_ALIAS = {
    home: 'home',
    krasniy: 'krasniy',
    padikovo: 'padikovo',
    voronino: 'voronino',
    riga: 'riga_24km',
    snegiri: 'snegiri',
    arhangelskoe: 'arhangel',
    nahabino: 'nahabino',
    istra: 'istra',
    dedovsk: 'dedovsk',
    nikoloy: 'nikoloy',
    nevsky: 'nevsky',
  };

  return {
    nodes: N,
    resolveStart(key) {
      return POI_ALIAS[key] || (N[key] ? key : 'home');
    },
    get(id) {
      return N[id] || null;
    },
    bearing,
  };
})();
