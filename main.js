import * as THREE from "three";

const canvas = document.querySelector(".webgl");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  canvas.clientWidth / canvas.clientHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setClearColor(0x000000, 0);
renderer.setSize(canvas.width, canvas.height);

const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(5, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xffff00 })
);
scene.add(sphere);

camera.position.z = 30;

const animate = () => {
  requestAnimationFrame(animate);

  sphere.rotation.x += 0.01;
  sphere.rotation.y += 0.01;

  renderer.render(scene, camera);
};

animate();

canvas.addEventListener("click", () => {
  const randomNumber = Math.random();
  const answer = randomNumber < 0.5 ? "Yes" : "No";
  console.log(answer);

  if (answer === "Yes") {
    sphere.material.color.set(0x00ff00);
  } else {
    sphere.material.color.set(0xff0000);
  }
});

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  camera.aspect = canvas.clientWidth / canvas.clientHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(canvas.width, canvas.height);
});
