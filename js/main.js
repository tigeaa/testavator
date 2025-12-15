import * as THREE from 'three';
import { setupScene } from './core/ThreeSetup.js';
import { loadAvatar } from './core/AvatarLoader.js';
import { AvatarController } from './controllers/AvatarController.js';
import { SpeechController } from './controllers/SpeechController.js';

/**
 * シーンに配置する椅子を生成します。
 * @returns {THREE.Group} 椅子の3Dオブジェクト
 */
function createChair() {
    const chair = new THREE.Group();
    const woodColor = 0x8B4513; // Brown color for wood

    // 座面
    const seatGeometry = new THREE.BoxGeometry(0.6, 0.08, 0.6);
    const seatMaterial = new THREE.MeshStandardMaterial({ color: woodColor });
    const seat = new THREE.Mesh(seatGeometry, seatMaterial);
    seat.position.y = 0;

    // 4本の脚
    const legGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.45, 12);
    const legMaterial = new THREE.MeshStandardMaterial({ color: woodColor });
    const legPositions = [
        {x: 0.25, z: 0.25},
        {x: -0.25, z: 0.25},
        {x: 0.25, z: -0.25},
        {x: -0.25, z: -0.25}
    ];

    for (const pos of legPositions) {
        const leg = new THREE.Mesh(legGeometry, legMaterial);
        // 脚の上部が座面の下にくるように配置
        leg.position.set(pos.x, -0.265, pos.z);
        chair.add(leg);
    }

    // 背もたれ
    const backGeometry = new THREE.BoxGeometry(0.6, 0.7, 0.05);
    const back = new THREE.Mesh(backGeometry, seatMaterial);
    // 座面の後ろに配置
    back.position.set(0, 0.39, -0.275);

    chair.add(seat);
    chair.add(back);

    // 椅子全体の位置を調整
    // 座面の高がアバターの膝あたり（約-0.5）にくるように設定
    chair.position.set(1.0, -0.45, 0);

    return chair;
}

/**
 * アプリケーションのメインエントリーポイント
 */
async function main() {
    // 1. Three.js環境をセットアップ
    const { scene, camera, renderer, clock, updatables } = setupScene();
    window.threeJsContext = { camera }; // Playwrightでカメラを操作するために公開

    // シーンに椅子を追加
    const chair = createChair();
    scene.add(chair);

    // 2. コントローラーを初期化
    const speechController = new SpeechController();
    let avatarController;

    // 3. アバターを読み込み
    try {
        const avatar = await loadAvatar(scene);
        avatarController = new AvatarController(avatar);
        updatables.push(avatarController); // updateループの対象に追加
        console.log('✅ アバターの読み込みとコントローラーの初期化が完了しました。');
    } catch (error) {
        console.error('❌ アバターの読み込みに失敗しました。アプリケーションを停止します。', error);
        // エラーメッセージを画面に表示するなどのフォールバック処理
        const errorDiv = document.createElement('div');
        errorDiv.textContent = 'アバターの読み込みに失敗しました。ページをリロードしてください。';
        errorDiv.style.position = 'absolute';
        errorDiv.style.top = '50%';
        errorDiv.style.left = '50%';
        errorDiv.style.transform = 'translate(-50%, -50%)';
        errorDiv.style.color = 'white';
        errorDiv.style.padding = '20px';
        errorDiv.style.background = 'rgba(255, 0, 0, 0.7)';
        document.body.appendChild(errorDiv);
        return;
    }

    // 4. UI要素のイベントリスナーを設定

    // --- 音声テストボタン ---
    document.getElementById('test-speech').addEventListener('click', () => {
        const text = 'こんにちは。これは音声合成とリップシンクのテストです。';
        speechController.speak(
            text,
            () => avatarController.startTalking(),
            () => avatarController.stopTalking()
        );
    });

    // --- カスタムテキスト入力 (Enterキー) ---
    const textInput = document.getElementById('text-input');
    textInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const text = textInput.value;
            if (text) {
                speechController.speak(
                    text,
                    () => avatarController.startTalking(),
                    () => avatarController.stopTalking()
                );
                textInput.value = ''; // 入力フィールドをクリア
            }
        }
    });

    // --- 表情テストボタン ---
    document.getElementById('test-expression').addEventListener('click', () => {
        // 簡単なまばたきテスト
        avatarController.setExpression('eyeBlinkLeft', 1.0);
        avatarController.setExpression('eyeBlinkRight', 1.0);

        setTimeout(() => {
            avatarController.setExpression('eyeBlinkLeft', 0.0);
            avatarController.setExpression('eyeBlinkRight', 0.0);
        }, 200);
    });

    // --- ジェスチャー確認ボタン (一時停止/再開) ---
    let isGesturePaused = false;
    document.getElementById('test-gesture').addEventListener('click', () => {
        if (isGesturePaused) {
            // アニメーションを再開
            avatarController.mixer.timeScale = 1;
            console.log('ジェスチャーを再開しました。');
        } else {
            // アニメーションを一時停止
            avatarController.mixer.timeScale = 0;
            console.log('ジェスチャーを一時停止しました。');
        }
        isGesturePaused = !isGesturePaused;
    });

    // --- 座る/立つボタン ---
    const sitButton = document.getElementById('toggle-sit');
    sitButton.addEventListener('click', () => {
        if (avatarController.state === 'idle') {
            // 椅子の少し手前を歩行ターゲットに設定
            const targetPosition = chair.position.clone();
            targetPosition.z += 0.6; // 椅子と正対する位置に調整
            targetPosition.x -= 0.1; // 少し中央に寄せる
            targetPosition.y = avatarController.avatar.position.y; // 地面の高さを維持

            // 1. 椅子まで歩く
            avatarController.walkTo(targetPosition, () => {
                // 2. 座る
                avatarController.sitDown(chair);
            });

        } else if (avatarController.state === 'sitting') {
            avatarController.standUp();
        }
    });

    // 5. アニメーションループを開始
    function animate() {
        requestAnimationFrame(animate);
        const deltaTime = clock.getDelta();

        // 更新処理
        for (const object of updatables) {
            object.update(deltaTime);
        }

        // ボタンのテキストをアバターの状態に応じて更新
        if (avatarController.state === 'sitting') {
            sitButton.textContent = '立つ';
            sitButton.disabled = false;
        } else if (avatarController.state === 'idle') {
            sitButton.textContent = '座る';
            sitButton.disabled = false;
        } else {
            sitButton.textContent = '動作中...';
            sitButton.disabled = true; // アニメーション中はボタンを無効化
        }

        renderer.render(scene, camera);
    }

    animate();
    console.log('🚀 アプリケーションが起動しました。');
}

// アプリケーション実行
main();
