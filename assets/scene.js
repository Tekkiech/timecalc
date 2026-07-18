import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const canvas = document.getElementById("bg-scene");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 9);

// 168 points arranged on a sphere — one per hour of the week.
const POINT_COUNT = 168;
const positions = new Float32Array(POINT_COUNT * 3);
const radius = 3.4;

for (let i = 0; i < POINT_COUNT; i++) {
  // fibonacci sphere distribution
  const y = 1 - (i / (POINT_COUNT - 1)) * 2;
  const r = Math.sqrt(1 - y * y);
  const theta = ((1 + Math.sqrt(5)) * Math.PI) * i;
  const x = Math.cos(theta) * r;
  const z = Math.sin(theta) * r;
  positions[i * 3] = x * radius;
  positions[i * 3 + 1] = y * radius;
  positions[i * 3 + 2] = z * radius;
}

const pointsGeo = new THREE.BufferGeometry();
pointsGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

const pointsMat = new THREE.PointsMaterial({
  color: 0xc8ff4d,
  size: 0.06,
  transparent: true,
  opacity: 0.85,
  sizeAttenuation: true,
});

const pointCloud = new THREE.Points(pointsGeo, pointsMat);
scene.add(pointCloud);

const wireGeo = new THREE.IcosahedronGeometry(radius, 1);
const wireMat = new THREE.MeshBasicMaterial({
  color: 0x5dd9ff,
  wireframe: true,
  transparent: true,
  opacity: 0.06,
});
const wireMesh = new THREE.Mesh(wireGeo, wireMat);
scene.add(wireMesh);

let targetRotX = 0;
let targetRotY = 0;
let mouseX = 0;
let mouseY = 0;

window.addEventListener("pointermove", (e) => {
  mouseX = (e.clientX / window.innerWidth) * 2 - 1;
  mouseY = (e.clientY / window.innerHeight) * 2 - 1;
});

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

function animate() {
  requestAnimationFrame(animate);

  if (!reducedMotion) {
    targetRotY += 0.0009;
    pointCloud.rotation.y = targetRotY;
    wireMesh.rotation.y = targetRotY * 0.6;

    targetRotX += (mouseY * 0.3 - targetRotX) * 0.02;
    pointCloud.rotation.x = targetRotX;
    wireMesh.rotation.x = targetRotX * 0.6;

    pointCloud.rotation.y += mouseX * 0.0003;
  }

  renderer.render(scene, camera);
}

if (reducedMotion) {
  renderer.render(scene, camera);
} else {
  animate();
}
