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
    `https://models.readyplayer.me/63e569fb6f759e4d1df880a2.glb${morphTargets}`,
    `https://models.readyplayer.me/6185a4acfb622cf1cdc49348.glb${morphTargets}` // This one is broken but kept as a fallback example
  ];

  for (const url of avatarUrls) {
    try {
      console.log(`アバターを読み込み中: ${url}`);
      const gltf = await loader.loadAsync(url, (xhr) => {
        // 読み込み進捗をコンソールに出力
        const percentComplete = (xhr.loaded / xhr.total) * 100;
        console.log(`読み込み中... ${Math.round(percentComplete)}%`);
      });

      const avatar = gltf.scene;

      // アバターをシーンの中央やや下に配置
      avatar.position.y = -0.9;

      // アバターのサイズや向きを調整（必要に応じて）
      // avatar.scale.set(1, 1, 1);
      // avatar.rotation.y = Math.PI; // 後ろ向きの場合など

      scene.add(avatar);
      console.log('✅ アバターの読み込みに成功しました。');
      return avatar; // 成功したらアバターオブジェクトを返す

    } catch (error) {
      console.warn(`アバターの読み込みに失敗しました: ${url}`, error);
      // 次のURLへループが続く
    }
  }

  // すべてのURLで読み込みに失敗した場合
  throw new Error('すべてのアバターURLの読み込みに失敗しました。');
}
