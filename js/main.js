import * as THREE from 'three';
import { setupScene } from './core/ThreeSetup.js';
import { loadAvatar } from './core/AvatarLoader.js';
import { AvatarController } from './controllers/AvatarController.js';

/**
 * アプリケーションのメインエントリーポイント
 */
async function main() {
    // 1. Three.js環境をセットアップ
    const { scene, camera, renderer, clock, updatables } = setupScene();

    // 2. 椅子をダミーで作成
    const chair = new THREE.Object3D();
    chair.position.set(1.0, -0.45, 0);
    scene.add(chair);

    // 3. アバターを読み込み、コントローラーを初期化
    try {
        const avatar = await loadAvatar(scene);
        const avatarController = new AvatarController(avatar);
        updatables.push(avatarController);

        await avatarController.init();

        // 椅子参照をコントローラーに設定
        avatarController.chair = chair;

        console.log('✅ Avatar and controller initialized.');

        // 「座る」ボタンのイベントリスナー
        document.getElementById('toggle-sit').addEventListener('click', () => {
            if (avatarController.state === 'idle') {
                // 歩いて椅子まで移動し、到着後に座る
                const targetPos = chair.position.clone();
                targetPos.y = avatar.position.y; // Y座標はアバターの高さを維持
                avatarController.walkTo(targetPos, () => {
                    avatarController.sitDown(chair);
                });
            } else if (avatarController.state === 'sitting') {
                // 座っている状態から立ち上がる
                avatarController.standUp();
            }
        });

    } catch (error) {
        console.error('❌ Failed to initialize avatar and controller.', error);
        return;
    }

    // 5. アニメーションループを開始
    function animate() {
        requestAnimationFrame(animate);
        const deltaTime = clock.getDelta();
        for (const object of updatables) {
            object.update(deltaTime);
        }
        renderer.render(scene, camera);
    }

    animate();
    console.log('🚀 Application started.');
}

main();
