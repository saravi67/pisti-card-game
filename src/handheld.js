// Device layer for handheld games (PocketVibe standard).
//
// Owns the screen (a canvas sized for the handheld's screen), input (gamepad +
// keyboard), the game loop, saving and a performance overlay.

import * as THREE from 'three';

export const SCREEN = { width: 720, height: 480 };
export const ASPECTS = { '3:2': 3 / 2, '4:3': 4 / 3, '16:9': 16 / 9, '1:1': 1 };

export function screenSize(aspect) {
  const a = Math.min(Math.max(aspect || SCREEN.width / SCREEN.height, 1), 2);
  const even = (n) => Math.round(n / 2) * 2;
  return a >= SCREEN.width / SCREEN.height
    ? { width: even(SCREEN.height * a), height: SCREEN.height }
    : { width: SCREEN.width, height: even(SCREEN.width / a) };
}

export const BUDGET = { drawCalls: 100, triangles: 10000, fps: 55 };
export const BUTTONS = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'A', 'B', 'X', 'Y', 'L', 'R', 'START', 'SELECT'];

const KEYMAP = {
  ArrowUp: 'UP',
  ArrowDown: 'DOWN',
  ArrowLeft: 'LEFT',
  ArrowRight: 'RIGHT',
  KeyX: 'A',
  KeyZ: 'B',
  KeyS: 'X',
  KeyA: 'Y',
  KeyQ: 'L',
  KeyW: 'R',
  Enter: 'START',
  ShiftLeft: 'SELECT',
  ShiftRight: 'SELECT',
};

const PADMAP = {
  0: 'B',
  1: 'A',
  2: 'X',
  3: 'Y',
  4: 'L',
  5: 'R',
  8: 'SELECT',
  9: 'START',
  12: 'UP',
  13: 'DOWN',
  14: 'LEFT',
  15: 'RIGHT',
};

const params = new URLSearchParams(location.search);
const onDevice = params.has('handheld');

function chooseScreen() {
  const size = /^(\d+)x(\d+)$/.exec(params.get('screen') ?? '');
  if (size) {
    const width = Number(size[1]);
    const height = Number(size[2]);
    if (width >= SCREEN.width && height >= SCREEN.height && width <= 1440 && height <= 1440) return { width, height };
  }
  const aspect = /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(params.get('aspect') ?? '');
  if (aspect) return screenSize(Number(aspect[1]) / Number(aspect[2]));
  return { ...SCREEN };
}

function chooseSecond() {
  const size = /^(\d+)x(\d+)$/.exec(params.get('second') ?? '');
  if (!size) return null;
  const width = Number(size[1]);
  const height = Number(size[2]);
  if (width < SCREEN.width || height < SCREEN.height || width > 1440 || height > 1440) return null;
  return { width, height, layout: params.get('layout') === 'right' ? 'right' : 'below' };
}

function createInput() {
  const keys = new Set();
  const tapped = new Set();
  let held = new Set();
  let prev = new Set();
  const dpad = { x: 0, y: 0 };

  addEventListener('keydown', (e) => {
    const button = KEYMAP[e.code];
    if (button) {
      keys.add(button);
      if (!e.repeat) tapped.add(button);
      e.preventDefault();
    }
  });
  addEventListener('keyup', (e) => {
    const button = KEYMAP[e.code];
    if (button) {
      keys.delete(button);
      e.preventDefault();
    }
  });
  addEventListener('blur', () => keys.clear());

  return {
    poll() {
      const swap = prev;
      prev = held;
      held = swap;
      held.clear();
      for (const button of keys) held.add(button);
      for (const button of tapped) held.add(button);
      tapped.clear();

      for (const pad of navigator.getGamepads?.() ?? []) {
        if (!pad) continue;
        pad.buttons.forEach((b, i) => {
          if (b.pressed && PADMAP[i]) held.add(PADMAP[i]);
        });
        const ax = pad.axes[0] ?? 0;
        const ay = pad.axes[1] ?? 0;
        if (ax < -0.5) held.add('LEFT');
        if (ax > 0.5) held.add('RIGHT');
        if (ay < -0.5) held.add('UP');
        if (ay > 0.5) held.add('DOWN');
      }

      dpad.x = held.has('RIGHT') - held.has('LEFT');
      dpad.y = held.has('DOWN') - held.has('UP');
    },
    down: (button) => held.has(button),
    pressed: (button) => held.has(button) && !prev.has(button),
    released: (button) => !held.has(button) && prev.has(button),
    dpad,
  };
}

function createPerfOverlay(parent, renderer) {
  const el = document.createElement('div');
  el.id = 'perf';
  el.hidden = onDevice && !params.has('perf');
  parent.appendChild(el);
  addEventListener('keydown', (e) => {
    if (e.code === 'KeyP') el.hidden = !el.hidden;
  });

  const log = params.has('perflog');
  let frames = 0;
  let windowStart = performance.now();
  let logFrames = 0;
  let logStart = windowStart;
  let last = windowStart;
  let worst = 0;
  return {
    el,
    frame(now) {
      const { calls, triangles } = renderer.info.render;
      if (log) {
        logFrames++;
        worst = Math.max(worst, now - last);
        if (now - logStart >= 2000) {
          const fps = (logFrames * 1000) / (now - logStart);
          console.log(`PERF ${JSON.stringify({ fps: +fps.toFixed(1), worstMs: Math.round(worst), calls, triangles })}`);
          logFrames = 0;
          logStart = now;
          worst = 0;
        }
      }
      last = now;
      frames++;
      if (now - windowStart < 500) return;
      const fps = (frames * 1000) / (now - windowStart);
      frames = 0;
      windowStart = now;
      if (el.hidden) return;
      el.textContent =
        `${fps.toFixed(0)} fps  ${(1000 / fps).toFixed(1)} ms\n` +
        `${calls} draws  ${(triangles / 1000).toFixed(1)}k tris`;
      el.classList.toggle('over', calls > BUDGET.drawCalls || triangles > BUDGET.triangles || fps < BUDGET.fps);
    },
  };
}

function fitScreen(frame, screen, size) {
  const fit = () => {
    const scale = onDevice ? 1 : Math.min((innerWidth - 48) / size.width, (innerHeight - 96) / size.height, 2);
    frame.style.width = `${size.width * scale}px`;
    frame.style.height = `${size.height * scale}px`;
    screen.style.transform = `scale(${scale})`;
  };
  addEventListener('resize', fit);
  fit();
}

function addShapeLinks(size, second) {
  const legend = document.getElementById('legend');
  if (!legend || onDevice) return;
  legend.append(' · Screen');
  const link = (text, active, set) => {
    const a = document.createElement('a');
    const url = new URL(location.href);
    url.searchParams.delete('second');
    url.searchParams.delete('layout');
    for (const [key, value] of Object.entries(set)) url.searchParams.set(key, value);
    a.href = url.href;
    a.textContent = text;
    a.style.marginLeft = '6px';
    a.style.color = active ? '#fff' : '#888';
    a.style.fontWeight = active ? '700' : '400';
    legend.append(a);
  };
  for (const [name, aspect] of Object.entries(ASPECTS)) {
    const { width, height } = screenSize(aspect);
    link(name, !second && width === size.width && height === size.height, { aspect: name });
  }
  const ds = screenSize(4 / 3);
  link('DS', Boolean(second), { aspect: '4:3', second: `${ds.width}x${ds.height}` });
}

export function createHandheld({ clearColor = 0x000000, resolution = 1 } = {}) {
  document.body.classList.toggle('handheld', onDevice);
  const frame = document.getElementById('frame');
  const screen = document.getElementById('screen');
  const hud = document.getElementById('hud');
  const size = chooseScreen();
  const { width, height } = size;
  const aspect = width / height;
  const secondSize = chooseSecond();

  const box = !secondSize
    ? { width, height }
    : secondSize.layout === 'right'
      ? { width: width + secondSize.width, height: Math.max(height, secondSize.height) }
      : { width: Math.max(width, secondSize.width), height: height + secondSize.height };
  screen.style.width = `${box.width}px`;
  screen.style.height = `${box.height}px`;
  screen.style.setProperty('--screen-width', `${width}px`);
  screen.style.setProperty('--screen-height', `${height}px`);
  hud.style.right = 'auto';
  hud.style.bottom = 'auto';
  hud.style.width = `${width}px`;
  hud.style.height = `${height}px`;

  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.setSize(Math.round(box.width * resolution), Math.round(box.height * resolution), false);
  renderer.domElement.style.width = `${box.width}px`;
  renderer.domElement.style.height = `${box.height}px`;
  renderer.setClearColor(clearColor);
  renderer.info.autoReset = false;
  screen.insertBefore(renderer.domElement, hud);

  const area = (x, y, w, h) => new THREE.Vector4(x, box.height - y - h, w, h).multiplyScalar(resolution);
  const mainArea = area(0, 0, width, height);
  let second = null;
  if (secondSize) {
    const x = secondSize.layout === 'right' ? width : 0;
    const y = secondSize.layout === 'right' ? 0 : height;
    const el = document.createElement('div');
    el.id = 'second';
    Object.assign(el.style, { position: 'absolute', left: `${x}px`, top: `${y}px`, width: `${secondSize.width}px`, height: `${secondSize.height}px`, overflow: 'hidden', pointerEvents: 'none' });
    screen.appendChild(el);
    const secondArea = area(x, y, secondSize.width, secondSize.height);
    renderer.setScissorTest(true);
    const use = (rect) => {
      renderer.setViewport(rect);
      renderer.setScissor(rect);
    };
    use(mainArea);
    second = {
      hud: el,
      width: secondSize.width,
      height: secondSize.height,
      aspect: secondSize.width / secondSize.height,
      render(scene, camera) {
        use(secondArea);
        renderer.render(scene, camera);
        use(mainArea);
      },
      fitCamera: (camera, options) => fitCameraTo(camera, secondSize.width / secondSize.height, options),
    };
  }

  fitScreen(frame, screen, box);
  addShapeLinks(size, secondSize);
  const input = createInput();
  const perf = createPerfOverlay(screen, renderer);
  if (secondSize) perf.el.style.right = `${box.width - width + 6}px`;

  const viewScale = (minAspect = SCREEN.width / SCREEN.height, shape = aspect) => Math.max(1, minAspect / shape);

  function fitCameraTo(camera, shape, { fov, height: viewHeight, center, minAspect } = {}) {
    const design = (camera.userData.design ??= camera.isOrthographicCamera
      ? { height: camera.top - camera.bottom, center: (camera.top + camera.bottom) / 2, middle: (camera.left + camera.right) / 2 }
      : { fov: camera.fov });
    const scale = viewScale(minAspect, shape);
    if (camera.isOrthographicCamera) {
      const half = ((viewHeight ?? design.height) * scale) / 2;
      const y = center ?? design.center;
      camera.top = y + half;
      camera.bottom = y - half;
      camera.left = design.middle - half * shape;
      camera.right = design.middle + half * shape;
    } else {
      const tan = Math.tan(THREE.MathUtils.degToRad(fov ?? design.fov) / 2) * scale;
      camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(tan));
      camera.aspect = shape;
    }
    camera.updateProjectionMatrix();
  }

  return {
    renderer,
    input,
    hud,
    width,
    height,
    aspect,
    onDevice,
    viewScale,
    second,
    fitCamera: (camera, options) => fitCameraTo(camera, aspect, options),
    run(update) {
      let last = performance.now();
      renderer.setAnimationLoop((now) => {
        const dt = Math.min(Math.max(now - last, 0) / 1000, 1 / 20);
        last = now;
        input.poll();
        renderer.info.reset();
        update(dt);
        perf.frame(now);
      });
    },
    save(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {}
    },
    load(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
  };
}
