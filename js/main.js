import { setupScene } from './core/ThreeSetup.js';
import { loadAvatar } from './core/AvatarLoader.js';
import { AvatarController } from './controllers/AvatarController.js';
import { SpeechController } from './controllers/SpeechController.js';

/**
 * アプリケーションのメインエントリーポイント
 */
async function main() {
    // 1. Three.js環境をセットアップ
    const { scene, animate, updatables } = setupScene();

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

    // 5. アニメーションループを開始
    animate();
    console.log('🚀 アプリケーションが起動しました。');
}

// アプリケーション実行
main();
