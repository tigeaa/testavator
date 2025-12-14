import * as THREE from 'three';

/**
 * Three.jsのシーン、カメラ、ライティング、レンダラーをセットアップし、
 * アニメーションループを開始するための基本的な環境を構築します。
 * @returns {{scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, animate: function, updatables: Array<object>}}
 */
export function setupScene() {
  // 1. レンダラーのセットアップ
  const canvas = document.getElementById('avatar-canvas');
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.outputEncoding = THREE.sRGBEncoding;

  // 2. シーンのセットアップ
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x808080); // グレー背景

  // 3. カメラのセットアップ
  const camera = new THREE.PerspectiveCamera(
    50, // FOV
    window.innerWidth / window.innerHeight, // Aspect Ratio
    0.1, // Near
    1000 // Far
  );
  camera.position.set(0, 0.5, 2);

  // 4. ライティングのセットアップ
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);

  // 5. 更新対象オブジェクトの配列
  const updatables = [];

  // 6. アニメーションループ
  const clock = new THREE.Clock();
  const animate = () => {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();

    // updatables配列内の全オブジェクトのupdateメソッドを呼ぶ
    for (const object of updatables) {
      object.update(deltaTime);
    }

    renderer.render(scene, camera);
  };

  // 7. ウィンドウリサイズへの対応
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, camera, renderer, animate, updatables };
}
