import * as THREE from 'three';

/**
 * アバターのジェスチャーアニメーションを管理するクラス
 */
export class GestureController {
  /**
   * @param {THREE.Object3D} avatar - アバターの3Dオブジェクト
   * @param {THREE.AnimationMixer} mixer - アニメーションミキサー
   */
  constructor(avatar, mixer) {
    this.avatar = avatar;
    this.mixer = mixer;
    this.bones = this.findBones();

    // ジェスチャーアニメーションを自動的に作成して再生
    this.wavingAction = this.createAndPlayWavingAnimation();
  }

  /**
   * アニメーションに必要な腕のボーンを探索して取得します。
   * @returns {{RightArm: THREE.Bone, LeftArm: THREE.Bone}}
   */
  findBones() {
    const bones = {};
    this.avatar.traverse((object) => {
      if (object.isBone) {
        if (object.name === 'RightArm') {
          bones['RightArm'] = object;
        } else if (object.name === 'LeftArm') {
          bones['LeftArm'] = object;
        }
      }
    });
    if (!bones['RightArm'] || !bones['LeftArm']) {
      console.error('腕のボーンが見つかりませんでした。ジェスチャーは再生されません。');
    }
    return bones;
  }

  /**
   * 両手を常に振り続けるアニメーションクリップを生成し、再生します。
   */
  createAndPlayWavingAnimation() {
    if (!this.bones['RightArm'] || !this.bones['LeftArm']) {
      return; // ボーンがなければ何もしない
    }

    const waveDuration = 4; // 4秒周期のアニメーション
    const times = [0, 1, 2, 3, 4];

    // --- 右腕のアニメーション ---
    const rightArmTracks = [
      // 1. Z軸回転: 腕を上げる (0 -> 1秒で -1.5 rad)
      new THREE.NumberKeyframeTrack(
        'RightArm.rotation[z]',
        [0, 1],
        [0, -1.5]
      ),
      // 2. Y軸回転: 腕を横に広げる (0 -> 1秒で -0.5 rad)
      new THREE.NumberKeyframeTrack(
        'RightArm.rotation[y]',
        [0, 1],
        [0, -0.5]
      ),
      // 3. X軸回転: 腕を前後に振る (1 -> 4秒で -0.5 -> 0.5 -> 0)
      new THREE.NumberKeyframeTrack(
        'RightArm.rotation[x]',
        [1, 2, 3, 4],
        [0, -0.5, 0.5, 0]
      ),
    ];

    // --- 左腕のアニメーション ---
    const leftArmTracks = [
       // 1. Z軸回転: 腕を上げる (0 -> 1秒で 1.5 rad)
       new THREE.NumberKeyframeTrack(
        'LeftArm.rotation[z]',
        [0, 1],
        [0, 1.5]
      ),
      // 2. Y軸回転: 腕を横に広げる (0 -> 1秒で 0.5 rad)
      new THREE.NumberKeyframeTrack(
        'LeftArm.rotation[y]',
        [0, 1],
        [0, 0.5]
      ),
      // 3. X軸回転: 腕を前後に振る (1 -> 4秒で -0.5 -> 0.5 -> 0)
      new THREE.NumberKeyframeTrack(
        'LeftArm.rotation[x]',
        [1, 2, 3, 4],
        [0, -0.5, 0.5, 0]
      ),
    ];

    const allTracks = [...rightArmTracks, ...leftArmTracks];
    const clip = new THREE.AnimationClip('Waving', waveDuration, allTracks);
    const action = this.mixer.clipAction(clip);

    action.setLoop(THREE.LoopRepeat).play();
    console.log('ジェスチャーアニメーションを開始しました。');
    return action;
  }
}
