import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

/**
 * Ready Player Meのアバターモデルを非同期で読み込み、シーンに追加します。
 * 複数のURLを試し、成功するまでフォールバックします。
 * @param {THREE.Scene} scene - アバターを追加するThree.jsシーン
 * @returns {Promise<THREE.Object3D>} 読み込みが成功したアバターオブジェクト
 */
export async function loadAvatar(scene) {
  const avatarUrls = [
    'https://models.readyplayer.me/6185a4acfb622cf1cdc49348.glb?morphTargets=ARKit',
    'https://models.readyplayer.me/63e569fb6f759e4d1df880a2.glb?morphTargets=ARKit', // フォールバック用
  ];

  const gltfLoader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://unpkg.com/three@0.158.0/examples/jsm/libs/draco/gltf/');
  gltfLoader.setDRACOLoader(dracoLoader);

  for (const url of avatarUrls) {
    try {
      console.log(`アバターを読み込み中: ${url}`);
      const gltf = await gltfLoader.loadAsync(url, (event) => {
        // 読み込み進捗をコンソールに出力
        const progress = (event.loaded / event.total) * 100;
        console.log(`読み込み進捗: ${Math.round(progress)}%`);
      });

      const avatar = gltf.scene;
      avatar.position.y = -0.9; // アバターを地面に配置
      scene.add(avatar);
      return avatar; // 成功したらアバターを返してループを抜ける

    } catch (error) {
      console.warn(`アバターの読み込みに失敗しました: ${url}`, error);
    }
  }

  // すべてのURLで失敗した場合
  throw new Error('すべてのアバターURLの読み込みに失敗しました。');
}
