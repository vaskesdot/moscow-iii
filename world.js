// MOSCOW III — 3D-прогулка (Three.js)
// Игрок от первого лица, перед ним абстрактная машина,
// движение WASD/тач-кнопки, обзор мышью/свайпом.

import * as THREE from 'three';

// ─────────────── Карта POI → skybox ───────────────
const SKYBOXES = {
  home:         'skyboxes/village.png',
  krasniy:      'skyboxes/town.png',
  padikovo:     'skyboxes/village.png',
  voronino:     'skyboxes/village.png',
  riga:         'skyboxes/town.png',
  snegiri:      'skyboxes/town.png',
  arhangelskoe: 'skyboxes/church.png',
  nahabino:     'skyboxes/town.png',
  istra:        'skyboxes/town.png',
  dedovsk:      'skyboxes/town.png',
  nikoloy:      'skyboxes/church.png',
  nevsky:       'skyboxes/church.png',
};

// ─────────────── Глобальное состояние ───────────────
let renderer, scene, camera, clock;
let player = {
  yaw: 0, pitch: 0,            // текущие углы камеры
  yawTarget: 0, pitchTarget: 0,// целевые (инпут пишет сюда)
  x: 0, z: 4,                  // позиция
  vx: 0, vz: 0,                // текущая скорость
  bobT: 0,                     // фаза покачивания
};
let car;
let keys = {};
let touch = { active: false, lastX: 0, lastY: 0 };
let mobileMove = { fwd: false, bwd: false, left: false, right: false };
let pointerLockActive = false;
let raf = null;
let initialized = false;
let currentSkybox = null;
let skyTexture = null;
let groundTexture = null;

// ─────────────── Инициализация сцены ───────────────
function init() {
  if (initialized) return;
  const canvas = document.getElementById('world-canvas');
  if (!canvas) return;

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(70, 1, 0.1, 500);
  camera.position.set(0, 1.65, 4);

  clock = new THREE.Clock();

  // Skybox-сфера — единственная геометрия в сцене
  const sphereGeo = new THREE.SphereGeometry(100, 64, 48);
  sphereGeo.scale(-1, 1, 1); // вывернем нормали внутрь
  const sphereMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const sky = new THREE.Mesh(sphereGeo, sphereMat);
  sky.name = 'skybox';
  scene.add(sky);

  // Размер
  resize();
  window.addEventListener('resize', resize);

  // Управление
  bindInputs();

  initialized = true;
}

// ───────────── (НЕ ИСПОЛЬЗУЕТСЯ) Машина (low-poly) ─────────────
function buildCar() {
  const g = new THREE.Group();

  // Корпус
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x2a3a4a });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.55, 4.2), bodyMat);
  body.position.y = 0.6;
  g.add(body);

  // Крыша/кабина
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.55, 2.0),
    new THREE.MeshLambertMaterial({ color: 0x1a2530 })
  );
  cabin.position.set(0, 1.05, -0.1);
  g.add(cabin);

  // Лобовое и заднее стекло — слегка прозрачные плоскости
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x88a4bc, transparent: true, opacity: 0.55 });
  const front = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.5), glassMat);
  front.position.set(0, 1.05, 0.95); front.rotation.x = -0.25;
  g.add(front);
  const back = front.clone(); back.position.z = -1.15; back.rotation.x = 0.25;
  g.add(back);

  // Колёса
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  const positions = [
    [ 0.95, 0.35,  1.4],
    [-0.95, 0.35,  1.4],
    [ 0.95, 0.35, -1.4],
    [-0.95, 0.35, -1.4],
  ];
  positions.forEach(p => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.position.set(p[0], p[1], p[2]);
    g.add(w);
  });

  // Фары (оранжевые в духе GTA)
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffb347 });
  for (const x of [-0.6, 0.6]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.15, 0.05), lampMat);
    lamp.position.set(x, 0.65, 2.1);
    g.add(lamp);
  }

  return g;
}

// ─────────────── Дерево ───────────────
function buildTree() {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.18, 1.6, 6),
    new THREE.MeshLambertMaterial({ color: 0xe8e8e8 })
  );
  trunk.position.y = 0.8;
  g.add(trunk);
  const leaves = new THREE.Mesh(
    new THREE.ConeGeometry(0.9, 2.0, 8),
    new THREE.MeshLambertMaterial({ color: 0x4a6b3e })
  );
  leaves.position.y = 2.2;
  g.add(leaves);
  return g;
}

// ─────────────── Размеры ───────────────
function resize() {
  if (!renderer) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

// ─────────────── Инпут ───────────────
function bindInputs() {
  // Клавиатура
  window.addEventListener('keydown', (e) => {
    if (!isActive()) return;
    keys[e.code] = true;
    if (e.code === 'Escape') {
      // выйти на карту
      const back = document.querySelector('[data-action="back"]');
      if (back) back.click();
    }
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });

  // Мышь — pointer lock на десктопе
  const canvas = document.getElementById('world-canvas');
  canvas.addEventListener('click', () => {
    if (!isActive()) return;
    if (!isMobile() && !pointerLockActive) {
      canvas.requestPointerLock?.();
    }
  });
  document.addEventListener('pointerlockchange', () => {
    pointerLockActive = document.pointerLockElement === canvas;
  });
  document.addEventListener('mousemove', (e) => {
    if (!isActive() || !pointerLockActive) return;
    player.yawTarget   -= e.movementX * 0.0022;
    player.pitchTarget -= e.movementY * 0.0022;
    player.pitchTarget = Math.max(-1.2, Math.min(1.2, player.pitchTarget));
  });

  // Тач — обзор свайпом
  canvas.addEventListener('touchstart', (e) => {
    if (!isActive()) return;
    const t = e.touches[0];
    touch.active = true;
    touch.lastX = t.clientX;
    touch.lastY = t.clientY;
  }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    if (!isActive() || !touch.active) return;
    const t = e.touches[0];
    const dx = t.clientX - touch.lastX;
    const dy = t.clientY - touch.lastY;
    touch.lastX = t.clientX;
    touch.lastY = t.clientY;
    player.yawTarget   -= dx * 0.0045;
    player.pitchTarget -= dy * 0.0045;
    player.pitchTarget = Math.max(-1.2, Math.min(1.2, player.pitchTarget));
  }, { passive: true });
  canvas.addEventListener('touchend', () => { touch.active = false; });

  // Мобильные кнопки движения
  const bindBtn = (id, key) => {
    const el = document.getElementById(id);
    if (!el) return;
    const start = (e) => { e.preventDefault?.(); mobileMove[key] = true; };
    const end   = (e) => { e.preventDefault?.(); mobileMove[key] = false; };
    el.addEventListener('touchstart', start, { passive: false });
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
    el.addEventListener('mousedown', start);
    el.addEventListener('mouseup', end);
    el.addEventListener('mouseleave', end);
  };
  bindBtn('btn-fwd',   'fwd');
  bindBtn('btn-bwd',   'bwd');
  bindBtn('btn-left',  'left');
  bindBtn('btn-right', 'right');
}

function isMobile() {
  return window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
}

function isActive() {
  const el = document.getElementById('pano-screen');
  return el && el.classList.contains('active');
}

// ─────────────── Геймплей-цикл ───────────────
function animate() {
  if (!isActive()) {
    raf = null;
    return;
  }
  const dt = Math.min(clock.getDelta(), 0.05);

  // ──── Инпут → целевой вектор движения ────
  let moveF = 0, moveS = 0;
  if (keys['KeyW'] || keys['ArrowUp']    || mobileMove.fwd)   moveF += 1;
  if (keys['KeyS'] || keys['ArrowDown']  || mobileMove.bwd)   moveF -= 1;
  if (keys['KeyD'] || keys['ArrowRight'] || mobileMove.right) moveS += 1;
  if (keys['KeyA'] || keys['ArrowLeft']  || mobileMove.left)  moveS -= 1;

  // Нормализация диагонали
  const len = Math.hypot(moveF, moveS);
  if (len > 1) { moveF /= len; moveS /= len; }

  // Направление от текущего угла камеры
  const fx = -Math.sin(player.yaw);
  const fz = -Math.cos(player.yaw);
  const sx =  Math.cos(player.yaw);
  const sz = -Math.sin(player.yaw);

  // Целевая скорость (максимум после разгона) — небыстрая ходьба
  const running = keys['ShiftLeft'] || keys['ShiftRight'];
  const maxSpeed = running ? 3.0 : 1.6;
  const targetVx = (fx * moveF + sx * moveS) * maxSpeed;
  const targetVz = (fz * moveF + sz * moveS) * maxSpeed;

  // ──── Инерция: плавный разгон и торможение ────
  // "время разгона" ≈ 0.6 сек, торможения ≈ 0.8 сек
  const accelerating = (moveF !== 0 || moveS !== 0);
  const tau = accelerating ? 0.55 : 0.85;
  // экспоненциальный lerp: коэфф = 1 - exp(-dt/tau)
  const k = 1 - Math.exp(-dt / tau);
  player.vx += (targetVx - player.vx) * k;
  player.vz += (targetVz - player.vz) * k;

  // Обнуляем микродребезг
  if (Math.abs(player.vx) < 0.01) player.vx = 0;
  if (Math.abs(player.vz) < 0.01) player.vz = 0;

  // Применение скорости
  player.x += player.vx * dt;
  player.z += player.vz * dt;

  // Ограничение радиуса — не уходим далеко от центра сферы,
  // иначе панорама искажается
  const r = Math.hypot(player.x, player.z);
  if (r > 8) {
    player.x *= 8 / r;
    player.z *= 8 / r;
    player.vx *= 0.3;
    player.vz *= 0.3;
  }

  // ──── Плавный поворот обзора ────
  const lookK = 1 - Math.exp(-dt / 0.08); // время сглаживания ≈ 80 мс
  player.yaw   += (player.yawTarget   - player.yaw)   * lookK;
  player.pitch += (player.pitchTarget - player.pitch) * lookK;

  // ──── Head-bob: покачивание при движении ────
  const speedNow = Math.hypot(player.vx, player.vz);
  const speedRatio = Math.min(speedNow / maxSpeed, 1);
  player.bobT += dt * (running ? 11 : 7) * speedRatio;
  const bobY = Math.sin(player.bobT) * 0.045 * speedRatio;
  const bobX = Math.cos(player.bobT * 0.5) * 0.025 * speedRatio;

  // ──── Камера ────
  const eyeY = 1.65 + bobY;
  // Лёгкий сдвиг влево/вправо относительно направления взгляда
  const sideX =  Math.cos(player.yaw) * bobX;
  const sideZ = -Math.sin(player.yaw) * bobX;
  camera.position.set(player.x + sideX, eyeY, player.z + sideZ);
  const lookX = player.x + Math.sin(player.yaw) * Math.cos(player.pitch) * -1;
  const lookY = eyeY + Math.sin(player.pitch);
  const lookZ = player.z + Math.cos(player.yaw) * Math.cos(player.pitch) * -1;
  camera.lookAt(lookX, lookY, lookZ);

  renderer.render(scene, camera);
  raf = requestAnimationFrame(animate);
}

// ─────────────── Публичное API: вход/выход ───────────────
export function enterWorld(key, label) {
  init();
  // Reset позиции — в центре сферы
  player.yaw = 0;
  player.pitch = 0;
  player.yawTarget = 0;
  player.pitchTarget = 0;
  player.x = 0;
  player.z = 0;
  player.vx = 0;
  player.vz = 0;
  player.bobT = 0;

  // Skybox
  const url = SKYBOXES[key] || SKYBOXES.home;
  if (currentSkybox !== url) {
    new THREE.TextureLoader().load(url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      const sky = scene.getObjectByName('skybox');
      if (sky) {
        sky.material.map = tex;
        sky.material.color.setHex(0xffffff);
        sky.material.needsUpdate = true;
      }
    });
    currentSkybox = url;
  }

  // Старт цикла
  if (!raf) {
    clock.start();
    raf = requestAnimationFrame(animate);
  }

  // Показать мобильные кнопки если тачскрин
  const mc = document.getElementById('move-controls');
  if (mc) mc.style.display = isMobile() ? 'grid' : 'none';
}

export function exitWorld() {
  if (raf) {
    cancelAnimationFrame(raf);
    raf = null;
  }
  if (document.pointerLockElement) document.exitPointerLock?.();
  pointerLockActive = false;
  keys = {};
  mobileMove = { fwd: false, bwd: false, left: false, right: false };
}

// Экспорт в глобал, чтобы script.js мог вызвать
window.MoscowWorld = {
  enterWorld,
  exitWorld,
  get _dbg() {
    return { x: player.x, z: player.z, vx: player.vx, vz: player.vz, v: Math.hypot(player.vx, player.vz) };
  }
};
