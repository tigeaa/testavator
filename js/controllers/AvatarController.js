import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GestureController } from './GestureController.js';

/**
 * Animation clip to skeleton matching utility
 * @param {THREE.AnimationClip} clip - The animation clip to retarget.
 * @returns {THREE.AnimationClip} - The retargeted animation clip.
 */
function retargetAnimation(clip) {
    const newTracks = clip.tracks.map(track => {
        const nodeName = track.name.split('.')[0];
        const newTrackName = `mixamorig${nodeName}.${track.name.split('.').slice(1).join('.')}`;
        return new track.constructor(newTrackName, track.times, track.values);
    });
    return new THREE.AnimationClip(clip.name, clip.duration, newTracks);
}

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

    // 2. GestureControllerを初期化
    this.gestureController = new GestureController(this.avatar, this.mixer);

    // 3. アニメーションの状態管理
    this.animations = {}; // 'walking', 'sitting' などを格納
    this.state = 'idle'; // 'idle', 'walking', 'sitting'
    this.activeAction = this.gestureController.wavingAction; // 初期状態は腕振り

    // 4. 歩行のためのプロパティ
    this.walkTarget = null;
    this.onWalkFinish = null;

    // 5. 準備完了フラグ
    this.isReady = false;
  }

  /**
   * コントローラーを非同期で初期化します。
   * FBXアニメーションの読み込みが完了するまで待機します。
   */
  async init() {
    await this.loadAnimations();
    this.isReady = true;
    console.log('✅ AvatarControllerの準備が完了しました。');
  }

  /**
   * 指定されたターゲット地点まで歩きます。
   * @param {THREE.Vector3} targetPosition - 目標地点
   * @param {function} onFinish - 到着時に呼び出されるコールバック
   */
  walkTo(targetPosition, onFinish) {
    this.state = 'walking';
    this.walkTarget = targetPosition;
    this.onWalkFinish = onFinish;
    this.fadeToAction('walking', 0.5);
  }

  /**
   * FBXアニメーションを非同期で読み込み、アニメーションアクションを準備します。
   * @returns {Promise<void>} すべてのアニメーションの読み込みが完了したときに解決されるPromise。
   */
  async loadAnimations() {
    const loader = new FBXLoader();
    const animationPaths = {
      walking: 'assets/animations/walking.fbx',
      sitting: 'assets/animations/sitting.fbx',
      standing_up: 'assets/animations/standing_up.fbx',
    };

    const promises = Object.entries(animationPaths).map(([name, path]) => {
      return new Promise((resolve, reject) => {
        loader.load(path, (fbx) => {
          const originalClip = fbx.animations[0];
          const retargetedClip = retargetAnimation(originalClip);
          const action = this.mixer.clipAction(retargetedClip);

          action.setLoop(name === 'walking' ? THREE.LoopRepeat : THREE.LoopOnce);
          action.clampWhenFinished = true;
          this.animations[name] = action;
          console.log(`✅ ${name} animation loaded and retargeted.`);
          resolve();
        }, undefined, (error) => {
          console.error(`❌ ${name}アニメーションの読み込みに失敗:`, error);
          reject(error);
        });
      });
    });

    await Promise.all(promises);
    console.log('✅ すべてのカスタムアニメーションの読み込みが完了しました。');
  }

  /**
   * 現在のアニメーションから新しいアニメーションへ滑らかに切り替えます。
   * @param {string} name - 切り替えたいアニメーション名
   * @param {number} duration - フェードの時間（秒）
   */
  fadeToAction(name, duration) {
    const targetAction = (name === 'waving')
      ? this.gestureController.wavingAction
      : this.animations[name];

    if (!targetAction || this.activeAction === targetAction) return;

    const previousAction = this.activeAction;
    this.activeAction = targetAction;

    if (previousAction && previousAction !== this.activeAction) {
      previousAction.fadeOut(duration);
    }

    this.activeAction
      .reset()
      .setEffectiveTimeScale(1)
      .setEffectiveWeight(1)
      .fadeIn(duration)
      .play();
  }

  /**
   * 座る/立つ動作を切り替えます。
   */
  toggleSit() {
    if (this.state === 'idle') {
      this.sitDown();
    } else if (this.state === 'sitting') {
      this.standUp();
    }
  }

  /**
   * 椅子に座る一連の動作を実行します。
   * @param {THREE.Object3D} chair - 椅子のオブジェクト
   */
  sitDown(chair) {
    this.state = 'sitting_inprogress';
    const sitAction = this.animations.sitting;
    sitAction.setLoop(THREE.LoopOnce);
    sitAction.clampWhenFinished = true;

    this.fadeToAction('sitting', 0.5);

    const onFinished = (e) => {
      if (e.action === sitAction) {
        sitAction.stop();
        const finalPosition = chair.position.clone();
        finalPosition.y += 0.5;
        finalPosition.z -= 0.1;
        this.avatar.position.copy(finalPosition);
        this.avatar.rotation.y = 0;

        this.state = 'sitting';
        this.mixer.removeEventListener('finished', onFinished);
      }
    };
    this.mixer.addEventListener('finished', onFinished);
  }

  /**
   * 椅子から立ち上がる一連の動作を実行します。
   */
  standUp() {
    this.state = 'standing_inprogress';
    const standAction = this.animations.standing_up;
    standAction.setLoop(THREE.LoopOnce);
    standAction.clampWhenFinished = true;

    this.fadeToAction('standing_up', 0.5);

    const onFinished = (e) => {
      if (e.action === standAction) {
        standAction.stop();
        this.state = 'idle';
        this.fadeToAction('waving', 0.5);
        this.mixer.removeEventListener('finished', onFinished);
      }
    };
    this.mixer.addEventListener('finished', onFinished);
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
    // 1. 歩行中の移動処理
    if (this.state === 'walking' && this.walkTarget) {
      const walkSpeed = 1.0; // 歩く速さ (units/sec)
      const direction = this.walkTarget.clone().sub(this.avatar.position).normalize();
      const distance = this.avatar.position.distanceTo(this.walkTarget);

      if (distance > 0.05) {
        this.avatar.position.add(direction.multiplyScalar(walkSpeed * deltaTime));
        // アバターを進行方向に向ける
        this.avatar.lookAt(this.walkTarget.x, this.avatar.position.y, this.walkTarget.z);
      } else {
        // ターゲットに到着
        this.avatar.position.copy(this.walkTarget);
        this.walkTarget = null;

        // onWalkFinishコールバックが存在すれば実行
        if (this.onWalkFinish) {
          this.onWalkFinish();
          this.onWalkFinish = null;
        } else {
          // コールバックがなければアイドル状態に戻る
          this.state = 'idle';
          this.fadeToAction('waving', 0.5);
        }
      }
    }

    // 2. アニメーションミキサーを更新
    this.mixer.update(deltaTime);

    // 3. リップシンクアニメーション (発話中のみ)
    if (this.isTalking) {
      const time = performance.now() * 0.005; // 時間ベースでアニメーション
      // 高速な正弦波で口の開閉を表現
      const mouthOpenValue = (Math.sin(time * 20) + 1) / 2;
      // 口の動きを120%に増幅して、より目立たせる
      this.setExpression('mouthOpen', mouthOpenValue * 1.2);
    }
  }
}
