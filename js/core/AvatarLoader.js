import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Ready Player Meのアバターを非同期で読み込み、シーンに追加します。
 * 複数のURLをフォールバックとして試行する機能を持ちます。
 * @param {THREE.Scene} scene - アバターを追加するThree.jsシーン
 * @returns {Promise<THREE.Object3D>} 読み込まれたアバターの3Dオブジェクト
 */
export async function loadAvatar(scene) {
  const loader = new GLTFLoader();

  // Morph Targets (表情) を有効にするためのパラメータ
  const morphTargets = '?morphTargets=ARKit';

  // アバターのURLリスト。最初のURLで失敗した場合、次のURLを試します。
  const avatarUrls = [
    'https://models.readyplayer.me/658d8399238313d3504107e5.glb?morphTargets=ARKit', // Known good URL
    'https://models.readyplayer.me/6460d95f9ae10f45a49942a5.glb?morphTargets=ARKit',
    `https://models.readyplayer.me/63e569fb6f759e4d1df880a2.glb${morphTargets}`,
  ];

  for (let i = 0; i < avatarUrls.length; i++) {
    const url = avatarUrls[i];
    try {
      console.log(`[Attempt ${i+1}/${avatarUrls.length}] Loading avatar from: ${url}`);
      const gltf = await loader.loadAsync(url, (xhr) => {
        const percentComplete = (xhr.loaded / xhr.total) * 100;
        console.log(`Loading... ${Math.round(percentComplete)}%`);
      });

      const avatar = gltf.scene;
      avatar.position.y = -0.9;
      scene.add(avatar);
      console.log('✅ Avatar loaded successfully.');
      return avatar;

    } catch (error) {
      console.error(`[Attempt ${i+1}/${avatarUrls.length}] Failed to load avatar from: ${url}`, error);
    }
  }

  // すべてのURLで読み込みに失敗した場合
  throw new Error('すべてのアバターURLの読み込みに失敗しました。');
}
