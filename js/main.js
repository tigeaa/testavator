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

        console.log('✅ Avatar and controller initialized.');

        // 4. 直接座るアニメーションをテスト
        avatarController.sitDown(chair);

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
