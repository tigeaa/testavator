import * as THREE from 'three';
import { GestureController } from './GestureController.js';

/**
 * アバターのリップシンク、表情、アニメーション全体を制御する中核クラス
 */
export class AvatarController {
  /**
   * @param {THREE.Object3D} avatar - Ready Player Meアバターの3Dオブジェクト
   */
  constructor(avatar) {
    this.avatar = avatar;
    this.isTalking = false;
    this.morphTargetMeshes = [];
    this.findMorphTargetMeshes();

    // 1. AnimationMixerを作成 (全アニメーションを統括)
    this.mixer = new THREE.AnimationMixer(this.avatar);

    // 2. GestureControllerを自動生成し、mixerを共有
    this.gestureController = new GestureController(this.avatar, this.mixer);

    console.log('AvatarControllerが初期化されました。');
  }

  /**
   * アバターのオブジェクトツリーを探索し、
   * モーフターゲットを持つメッシュをすべて収集します。
   */
  findMorphTargetMeshes() {
    this.avatar.traverse((object) => {
      if (object.isMesh && object.morphTargetInfluences) {
        this.morphTargetMeshes.push(object);
      }
    });
    console.log(`モーフターゲットを持つメッシュが${this.morphTargetMeshes.length}個見つかりました。`);
  }

  /**
   * リップシンクを開始します。
   */
  startTalking() {
    this.isTalking = true;
  }

  /**
   * リップシンクを停止し、口を閉じます。
   */
  stopTalking() {
    this.isTalking = false;
    // 口を完全に閉じる
    this.setExpression('mouthOpen', 0);
  }

  /**
   * 指定された表情モーフターゲットの値を設定します。
   * @param {string} expressionName - 表情名 (例: 'mouthOpen', 'eyeBlinkLeft')
   * @param {number} value - 表情の強さ (0.0 - 1.0)
   */
  setExpression(expressionName, value) {
    for (const mesh of this.morphTargetMeshes) {
      const morphTargetIndex = mesh.morphTargetDictionary[expressionName];
      if (morphTargetIndex !== undefined) {
        mesh.morphTargetInfluences[morphTargetIndex] = THREE.MathUtils.clamp(value, 0, 1);
      }
    }
  }

  /**
   * 毎フレーム呼び出される更新処理。
   * AnimationMixerの更新とリップシンクアニメーションを処理します。
   * @param {number} deltaTime - 前のフレームからの経過時間 (秒)
   */
  update(deltaTime) {
    // 1. ジェスチャーなどのアニメーションを更新
    this.mixer.update(deltaTime);

    // 2. リップシンクアニメーション (発話中のみ)
    if (this.isTalking) {
      const time = performance.now() * 0.005; // 時間ベースでアニメーション
      // 高速な正弦波で口の開閉を表現
      const mouthOpenValue = (Math.sin(time * 20) + 1) / 2;
      // 口の動きを120%に増幅して、より目立たせる
      this.setExpression('mouthOpen', mouthOpenValue * 1.2);
    }
  }
}
