import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
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

    // 2. GestureControllerを初期化
    this.gestureController = new GestureController(this.avatar, this.mixer);

    // 3. アニメーションの状態管理
    this.animations = {}; // 'walking', 'sitting' などを格納
    this.state = 'idle'; // 'idle', 'walking', 'sitting'
    this.activeAction = this.gestureController.wavingAction; // 初期状態は腕振り

    // 4. 歩行のためのプロパティ
    this.walkTarget = null;
    this.onWalkFinish = null;

    // 5. 新しいアニメーションを非同期で読み込む
    this.loadAnimations();
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
   * 歩行、着席、起立のアニメーションを非同期で読み込みます。
   */
  async loadAnimations() {
    const loader = new FBXLoader();
    const animFiles = {
      walking: 'assets/animations/walking.fbx',
      sitting: 'assets/animations/sitting.fbx',
      standingUp: 'assets/animations/standing_up.fbx',
    };

    try {
      for (const [name, path] of Object.entries(animFiles)) {
        const fbx = await loader.loadAsync(path);
        const action = this.mixer.clipAction(fbx.animations[0]);
        action.setLoop(name === 'walking' ? THREE.LoopRepeat : THREE.LoopOnce);
        action.clampWhenFinished = (name !== 'walking');
        this.animations[name] = action;
      }
      console.log('✅ 追加アニメーションの読み込みが完了しました。');
    } catch (error) {
      console.error('❌ アニメーションの読み込みに失敗しました:', error);
    }
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
    this.fadeToAction('sitting', 0.5);

    // アニメーションが完了したら、最終的な位置と向きを調整
    const onFinished = (e) => {
      if (e.action === this.animations.sitting) {
        // 最終的な着席位置を椅子の座面に合わせる
        const finalPosition = chair.position.clone();
        finalPosition.y = this.avatar.position.y; // Y座標は現在の高さを維持
        finalPosition.z -= 0.1; // 少しだけ椅子にめり込ませて自然に見せる
        this.avatar.position.copy(finalPosition);

        // 正面を向くように調整
        const lookAtTarget = new THREE.Vector3(0, this.avatar.position.y, 0);
        this.avatar.lookAt(lookAtTarget);

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
    this.fadeToAction('standingUp', 0.5);

    // アニメーションが終了したときのリスナーを一度だけ設定
    const onFinished = (e) => {
      if (e.action === this.animations.standingUp) {
        this.state = 'idle';
        this.fadeToAction('waving', 0.5);
        // リスナーを解除
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
        this.state = 'idle';
        this.fadeToAction('waving', 0.5);
        if (this.onWalkFinish) {
          this.onWalkFinish();
          this.onWalkFinish = null;
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
