import * as THREE from 'three';

const TEXTURE_SIZE = 512;
const SPHERE_RADIUS = 1.2;
const ANIM_DURATION_MS = 520;
const BOUNCE_DURATION_MS = 380;
const HOVER_SCALE = 1.08;
const BASE_SCALE = 1;
const ROTATION_Y_TEXT_FACING = -Math.PI / 2;
const THEMES = {
  idle: { background: 0xe8eaf0, sphere: 0xd8dce4, text: null },
  YES: { background: 0xd4edda, sphere: 0x8bc99a, text: '#1e6b2e' },
  NO: { background: 0xffe8e4, sphere: 0xe8a090, text: '#a63d2e' },
};

let scene, camera, renderer, sphere, raycaster, mouse;
let textureCanvas, textureContext, canvasTexture;
let bumpCanvas, bumpContext, bumpTexture;
let isAnimating = false;
let isHovering = false;
let animStartTime = 0;
let currentResult = null;
let sphereBaseScale = new THREE.Vector3(BASE_SCALE, BASE_SCALE, BASE_SCALE);

function createTextTexture() {
  textureCanvas = document.createElement('canvas');
  textureCanvas.width = TEXTURE_SIZE;
  textureCanvas.height = TEXTURE_SIZE;
  textureContext = textureCanvas.getContext('2d');
  canvasTexture = new THREE.CanvasTexture(textureCanvas);
  canvasTexture.colorSpace = THREE.SRGBColorSpace;
  canvasTexture.wrapS = THREE.RepeatWrapping;
  canvasTexture.wrapT = THREE.ClampToEdgeWrapping;
  updateColorMap(THEMES.idle.sphere);
  return canvasTexture;
}

function updateColorMap(sphereColorHex) {
  const ctx = textureContext;
  const w = TEXTURE_SIZE;
  const h = TEXTURE_SIZE;
  ctx.save();
  ctx.translate(0, h);
  ctx.scale(1, -1);
  ctx.clearRect(0, 0, w, h);
  const hex = sphereColorHex != null ? sphereColorHex : THEMES.idle.sphere;
  ctx.fillStyle = '#' + hex.toString(16).padStart(6, '0');
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  canvasTexture.needsUpdate = true;
}

function createBumpTexture() {
  bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = TEXTURE_SIZE;
  bumpCanvas.height = TEXTURE_SIZE;
  bumpContext = bumpCanvas.getContext('2d');
  bumpTexture = new THREE.CanvasTexture(bumpCanvas);
  bumpTexture.wrapS = THREE.RepeatWrapping;
  bumpTexture.wrapT = THREE.ClampToEdgeWrapping;
  updateBumpMap(null);
  return bumpTexture;
}

function updateBumpMap(result) {
  const ctx = bumpContext;
  const w = TEXTURE_SIZE;
  const h = TEXTURE_SIZE;
  ctx.save();
  ctx.translate(0, h);
  ctx.scale(1, -1);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  if (!result) {
    ctx.restore();
    bumpTexture.needsUpdate = true;
    return;
  }
  const x = w / 2;
  const y = h / 2;
  const fontSize = Math.floor(TEXTURE_SIZE * 0.26);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold ' + fontSize + 'px system-ui, sans-serif';
  ctx.translate(x, y);
  ctx.scale(0.5, 1);
  ctx.translate(-x, -y);
  ctx.fillStyle = '#000000';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 8;
  ctx.lineJoin = 'round';
  ctx.strokeText(result, x, y);
  ctx.fillText(result, x, y);
  ctx.restore();
  bumpTexture.needsUpdate = true;
}

function applyTheme(result) {
  const key = result || 'idle';
  const theme = THEMES[key];
  scene.background.setHex(theme.background);
  document.body.style.background = '#' + theme.background.toString(16).padStart(6, '0');
  sphere.material.color.setHex(0xffffff);
  updateColorMap(theme.sphere);
  const textToShow = key === 'YES' || key === 'NO' ? key : null;
  updateBumpMap(textToShow);
}

function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(THEMES.idle.background);
}

function initCamera(container) {
  const aspect = container.clientWidth / container.clientHeight;
  camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
  camera.position.z = 4;
  camera.lookAt(0, 0, 0);
}

function initRenderer(container) {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  container.appendChild(renderer.domElement);
}

function initLights() {
  const ambient = new THREE.AmbientLight(0xffffff, 0.85);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(2, 3, 2);
  scene.add(dir);
  const fill = new THREE.DirectionalLight(0xffffff, 0.4);
  fill.position.set(-1.5, 0.5, 1);
  scene.add(fill);
}

function createSphere() {
  const geometry = new THREE.SphereGeometry(SPHERE_RADIUS, 64, 64);
  const material = new THREE.MeshStandardMaterial({
    map: createTextTexture(),
    bumpMap: createBumpTexture(),
    bumpScale: 0.5,
    metalness: 0.08,
    roughness: 0.6,
    color: 0xffffff,
  });
  sphere = new THREE.Mesh(geometry, material);
  sphere.userData.baseScale = BASE_SCALE;
  scene.add(sphere);
}

function initInteraction(container) {
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  const canvas = renderer.domElement;

  function onPointerMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function onClick() {
    if (isAnimating) return;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObject(sphere);
    if (hits.length) startRevealAnimation();
  }

  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('click', onClick);
  canvas.style.cursor = 'pointer';
}

function startRevealAnimation() {
  isAnimating = true;
  animStartTime = performance.now();
  const result = Math.random() < 0.5 ? 'YES' : 'NO';
  currentResult = result;
  updateColorMap(THEMES.idle.sphere);
  updateBumpMap(null);
  sphere.rotation.set(0, 0, 0);
  requestAnimationFrame(animateReveal);
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function animateReveal(now) {
  const elapsed = now - animStartTime;
  const t = Math.min(elapsed / ANIM_DURATION_MS, 1);
  const eased = easeOutCubic(t);
  sphere.rotation.x = 0;
  sphere.rotation.z = 0;
  sphere.rotation.y = eased * (Math.PI + ROTATION_Y_TEXT_FACING);

  if (t < 1) {
    requestAnimationFrame(animateReveal);
    return;
  }

  applyTheme(currentResult);

  const bounceStart = performance.now();
  function doBounce(time) {
    const bElapsed = time - bounceStart;
    const bt = Math.min(bElapsed / BOUNCE_DURATION_MS, 1);
    const scale = 1 + 0.12 * Math.sin(bt * Math.PI);
    sphere.scale.setScalar(scale);
    if (bt < 1) requestAnimationFrame(doBounce);
    else {
      sphere.scale.copy(sphereBaseScale);
      isAnimating = false;
    }
  }
  requestAnimationFrame(doBounce);
}

function updateHover(now) {
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObject(sphere);
  const hover = hits.length > 0 && !isAnimating;
  if (hover !== isHovering) isHovering = hover;
  if (!isAnimating) {
    const targetScale = isHovering ? HOVER_SCALE : BASE_SCALE;
    sphere.scale.lerp(sphereBaseScale.clone().multiplyScalar(targetScale), 0.12);
  }
}

function tick(now) {
  updateHover(now);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

function onResize() {
  const container = document.getElementById('canvas-container');
  if (!camera || !renderer || !container) return;
  const w = container.clientWidth;
  const h = container.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

(function run() {
  const container = document.getElementById('canvas-container');
  initScene();
  initCamera(container);
  initRenderer(container);
  initLights();
  createSphere();
  applyTheme('idle');
  initInteraction(container);
  window.addEventListener('resize', onResize);
  requestAnimationFrame(tick);
})();
