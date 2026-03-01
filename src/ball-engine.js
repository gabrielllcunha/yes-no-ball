import * as THREE from 'three'

const TEXTURE_SIZE = 512
const SPHERE_RADIUS = 1.2
const ANIM_DURATION_MS = 500
const BOUNCE_DURATION_MS = 380
const HOVER_SCALE = 1.08
const BASE_SCALE = 1
const ROTATION_Y_TEXT_FACING = -Math.PI / 2
const THEMES = {
  idle: { background: 0xeef0f5, sphere: 0xc4c9d4, text: null },
  YES: { background: 0xdcfce7, sphere: 0x22c55e, text: '#166534' },
  NO: { background: 0xfee2e2, sphere: 0xef4444, text: '#991b1b' },
}

export function createYesNoBall(container) {
  let scene, camera, renderer, sphere, raycaster, mouse
  let textureCanvas, textureContext, canvasTexture
  let bumpCanvas, bumpContext, bumpTexture
  let textSprite, textSpriteCanvas, textSpriteTexture
  let isAnimating = false
  let isHovering = false
  let animStartTime = 0
  let currentResult = null
  let sphereBaseScale = new THREE.Vector3(BASE_SCALE, BASE_SCALE, BASE_SCALE)
  let animationFrameId = null
  let destroyed = false

  function createTextTexture() {
    textureCanvas = document.createElement('canvas')
    textureCanvas.width = TEXTURE_SIZE
    textureCanvas.height = TEXTURE_SIZE
    textureContext = textureCanvas.getContext('2d')
    canvasTexture = new THREE.CanvasTexture(textureCanvas)
    canvasTexture.colorSpace = THREE.SRGBColorSpace
    canvasTexture.wrapS = THREE.RepeatWrapping
    canvasTexture.wrapT = THREE.ClampToEdgeWrapping
    updateColorMap(THEMES.idle.sphere)
    return canvasTexture
  }

  function updateColorMap(sphereColorHex, result) {
    if (!textureContext || !canvasTexture) return
    const ctx = textureContext
    const w = TEXTURE_SIZE
    const h = TEXTURE_SIZE
    ctx.save()
    ctx.translate(0, h)
    ctx.scale(1, -1)
    ctx.clearRect(0, 0, w, h)
    const hex = sphereColorHex != null ? sphereColorHex : THEMES.idle.sphere
    ctx.fillStyle = '#' + hex.toString(16).padStart(6, '0')
    ctx.fillRect(0, 0, w, h)
    if (!result) {
      const r = ((hex >> 16) & 255) / 255
      const g = ((hex >> 8) & 255) / 255
      const b = (hex & 255) / 255
      const grad = ctx.createLinearGradient(0, 0, w, 0)
      grad.addColorStop(0, `rgba(${(r * 140) | 0},${(g * 140) | 0},${(b * 140) | 0},0.12)`)
      grad.addColorStop(0.5, 'rgba(0,0,0,0)')
      grad.addColorStop(1, `rgba(${(r * 255) | 0},${(g * 255) | 0},${(b * 255) | 0},0.08)`)
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)
    }
    if (result) {
      const x = w / 2
      const y = h / 2
      const fontSize = Math.floor(TEXTURE_SIZE * 0.28)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = 'bold ' + fontSize + 'px "DM Sans", system-ui, sans-serif'
      ctx.translate(x, y)
      ctx.scale(0.5, 1)
      ctx.translate(-x, -y)
      ctx.strokeStyle = '#111'
      ctx.lineWidth = 12
      ctx.lineJoin = 'round'
      ctx.miterLimit = 2
      ctx.strokeText(result, x, y)
      ctx.fillStyle = '#ffffff'
      ctx.fillText(result, x, y)
    }
    ctx.restore()
    canvasTexture.needsUpdate = true
  }

  function createBumpTexture() {
    bumpCanvas = document.createElement('canvas')
    bumpCanvas.width = TEXTURE_SIZE
    bumpCanvas.height = TEXTURE_SIZE
    bumpContext = bumpCanvas.getContext('2d')
    bumpTexture = new THREE.CanvasTexture(bumpCanvas)
    bumpTexture.wrapS = THREE.RepeatWrapping
    bumpTexture.wrapT = THREE.ClampToEdgeWrapping
    updateBumpMap(null)
    return bumpTexture
  }

  function updateBumpMap(result) {
    if (!bumpContext || !bumpTexture) return
    const ctx = bumpContext
    const w = TEXTURE_SIZE
    const h = TEXTURE_SIZE
    ctx.save()
    ctx.translate(0, h)
    ctx.scale(1, -1)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    if (!result) {
      ctx.restore()
      bumpTexture.needsUpdate = true
      return
    }
    const x = w / 2
    const y = h / 2
    const fontSize = Math.floor(TEXTURE_SIZE * 0.26)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = 'bold ' + fontSize + 'px "DM Sans", system-ui, sans-serif'
    ctx.translate(x, y)
    ctx.scale(0.5, 1)
    ctx.translate(-x, -y)
    ctx.fillStyle = '#000000'
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 8
    ctx.lineJoin = 'round'
    ctx.strokeText(result, x, y)
    ctx.fillText(result, x, y)
    ctx.restore()
    bumpTexture.needsUpdate = true
  }

  function createTextSprite() {
    const W = 512
    const H = 256
    textSpriteCanvas = document.createElement('canvas')
    textSpriteCanvas.width = W
    textSpriteCanvas.height = H
    const ctx = textSpriteCanvas.getContext('2d')
    ctx.fillStyle = 'rgba(0,0,0,0)'
    ctx.fillRect(0, 0, W, H)
    textSpriteTexture = new THREE.CanvasTexture(textSpriteCanvas)
    textSpriteTexture.colorSpace = THREE.SRGBColorSpace
    const material = new THREE.SpriteMaterial({
      map: textSpriteTexture,
      transparent: true,
      depthWrite: false,
    })
    textSprite = new THREE.Sprite(material)
    textSprite.position.set(-(SPHERE_RADIUS + 0.02), 0, 0)
    textSprite.scale.set(1.1, 0.45, 1)
    textSprite.visible = false
    sphere.add(textSprite)
  }

  function darkerHex(hex, factor) {
    const r = Math.floor(((hex >> 16) & 255) * factor)
    const g = Math.floor(((hex >> 8) & 255) * factor)
    const b = Math.floor((hex & 255) * factor)
    return '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')
  }

  function updateTextSprite(result, sphereColorHex) {
    if (!textSprite || !textSpriteCanvas) return
    const ctx = textSpriteCanvas.getContext('2d')
    const W = textSpriteCanvas.width
    const H = textSpriteCanvas.height
    ctx.clearRect(0, 0, W, H)
    if (!result) {
      textSprite.visible = false
      textSpriteTexture.needsUpdate = true
      return
    }
    const x = W / 2
    const y = H / 2
    const fontSize = 120
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = 'bold ' + fontSize + 'px "DM Sans", system-ui, sans-serif'
    ctx.fillStyle = sphereColorHex != null ? darkerHex(sphereColorHex, 0.5) : '#333'
    ctx.fillText(result, x, y)
    textSpriteTexture.needsUpdate = true
    textSprite.visible = true
  }

  function applyTheme(result) {
    const key = result || 'idle'
    const theme = THEMES[key]
    scene.background.setHex(theme.background)
    document.body.style.background = '#' + theme.background.toString(16).padStart(6, '0')
    sphere.material.color.setHex(0xffffff)
    const textToShow = key === 'YES' || key === 'NO' ? key : null
    updateColorMap(theme.sphere, textToShow)
    updateBumpMap(textToShow)
    updateTextSprite(textToShow, theme.sphere)
  }

  scene = new THREE.Scene()
  scene.background = new THREE.Color(THEMES.idle.background)

  const aspect = container.clientWidth / container.clientHeight
  camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100)
  camera.position.z = 4
  camera.lookAt(0, 0, 0)

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1
  container.appendChild(renderer.domElement)

  const ambient = new THREE.AmbientLight(0xffffff, 0.85)
  scene.add(ambient)
  const dir = new THREE.DirectionalLight(0xffffff, 0.9)
  dir.position.set(2, 3, 2)
  scene.add(dir)
  const fill = new THREE.DirectionalLight(0xffffff, 0.4)
  fill.position.set(-1.5, 0.5, 1)
  scene.add(fill)

  const geometry = new THREE.SphereGeometry(SPHERE_RADIUS, 64, 64)
  const material = new THREE.MeshStandardMaterial({
    map: createTextTexture(),
    bumpMap: createBumpTexture(),
    bumpScale: 0.5,
    metalness: 0.08,
    roughness: 0.6,
    color: 0xffffff,
  })
  sphere = new THREE.Mesh(geometry, material)
  sphere.userData.baseScale = BASE_SCALE
  scene.add(sphere)
  createTextSprite()

  applyTheme('idle')

  raycaster = new THREE.Raycaster()
  mouse = new THREE.Vector2()
  const canvas = renderer.domElement

  function onPointerMove(e) {
    const rect = canvas.getBoundingClientRect()
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
  }

  function startRevealAnimation() {
    if (destroyed) return
    isAnimating = true
    animStartTime = performance.now()
    applyTheme('idle')
    const result = Math.random() < 0.5 ? 'YES' : 'NO'
    currentResult = result
    updateTextSprite(null)
    updateColorMap(THEMES.idle.sphere)
    updateBumpMap(null)
    sphere.rotation.set(0, 0, 0)
    requestAnimationFrame(animateReveal)
  }

  function animateReveal(now) {
    if (destroyed) return
    const elapsed = now - animStartTime
    const t = Math.min(elapsed / ANIM_DURATION_MS, 1)
    const spinY = 2 * Math.PI + (Math.PI + ROTATION_Y_TEXT_FACING)
    sphere.rotation.x = t * 2 * Math.PI
    sphere.rotation.y = t * spinY
    sphere.rotation.z = t * 2 * Math.PI

    if (t < 1) {
      animationFrameId = requestAnimationFrame(animateReveal)
      return
    }

    applyTheme(currentResult)

    const bounceStart = performance.now()
    function doBounce(time) {
      if (destroyed) return
      const bElapsed = time - bounceStart
      const bt = Math.min(bElapsed / BOUNCE_DURATION_MS, 1)
      const scale = 1 + 0.12 * Math.sin(bt * Math.PI)
      sphere.scale.setScalar(scale)
      if (bt < 1) {
        animationFrameId = requestAnimationFrame(doBounce)
      } else {
        sphere.scale.copy(sphereBaseScale)
        isAnimating = false
      }
    }
    animationFrameId = requestAnimationFrame(doBounce)
  }

  function onClick() {
    if (isAnimating || destroyed) return
    raycaster.setFromCamera(mouse, camera)
    const hits = raycaster.intersectObject(sphere)
    if (hits.length) startRevealAnimation()
  }

  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('click', onClick)
  canvas.style.cursor = 'pointer'

  function updateHover(now) {
    if (destroyed) return
    raycaster.setFromCamera(mouse, camera)
    const hits = raycaster.intersectObject(sphere)
    const hover = hits.length > 0 && !isAnimating
    if (hover !== isHovering) isHovering = hover
    if (!isAnimating) {
      const targetScale = isHovering ? HOVER_SCALE : BASE_SCALE
      sphere.scale.lerp(sphereBaseScale.clone().multiplyScalar(targetScale), 0.12)
    }
  }

  function tick(now) {
    if (destroyed) return
    updateHover(now)
    renderer.render(scene, camera)
    animationFrameId = requestAnimationFrame(tick)
  }
  animationFrameId = requestAnimationFrame(tick)

  function onResize() {
    if (destroyed || !camera || !renderer || !container) return
    const w = container.clientWidth
    const h = container.clientHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  }
  window.addEventListener('resize', onResize)

  return function destroy() {
    destroyed = true
    if (animationFrameId != null) cancelAnimationFrame(animationFrameId)
    window.removeEventListener('resize', onResize)
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('click', onClick)
    renderer.dispose()
    if (container.contains(renderer.domElement)) {
      container.removeChild(renderer.domElement)
    }
    geometry.dispose()
    material.map?.dispose()
    material.bumpMap?.dispose()
    material.dispose()
    textSpriteTexture?.dispose()
  }
}
