import { useEffect, useRef, useCallback, useState } from "react";
import * as THREE from "three";
import { GamePlayer, Monster, Vector3, WorldLoot } from "@/lib/gameTypes";

interface Game3DData {
  scene: THREE.Scene | null;
  camera: THREE.Camera | null;
  renderer: THREE.WebGLRenderer | null;
  playerMesh: THREE.Mesh | null;
  updatePlayerPosition: (position: Vector3, rotation?: number) => void;
  updateOtherPlayers: (players: GamePlayer[]) => void;
  addMonster: (monster: Monster) => void;
  removeMonster: (monsterId: string) => void;
  addLoot: (loot: WorldLoot) => void;
  removeLoot: (lootId: string) => void;
  getCameraTarget: () => Vector3 | null;
}

export function useGame3D(containerRef: React.RefObject<HTMLElement>): Game3DData {
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const playerMeshRef = useRef<THREE.Mesh | null>(null);
  const otherPlayersRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const monstersRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const lootRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const animationFrameRef = useRef<number>();
  
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current || isInitialized) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2d3748); // Dark gray background
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 10, 20);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Ground plane (Selha Latna tutorial zone)
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x4a5568,
      transparent: true,
      opacity: 0.8
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Create grid overlay
    const gridHelper = new THREE.GridHelper(200, 40, 0x718096, 0x4a5568);
    scene.add(gridHelper);

    // Add some environmental objects (ancient structures)
    for (let i = 0; i < 10; i++) {
      const pillarGeometry = new THREE.CylinderGeometry(1, 1.5, 8, 8);
      const pillarMaterial = new THREE.MeshLambertMaterial({ color: 0x6b7280 });
      const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
      
      const angle = (i / 10) * Math.PI * 2;
      const radius = 40 + Math.random() * 30;
      pillar.position.x = Math.cos(angle) * radius;
      pillar.position.z = Math.sin(angle) * radius;
      pillar.position.y = 4;
      pillar.castShadow = true;
      
      scene.add(pillar);
    }

    // Create player character
    const playerGeometry = new THREE.CapsuleGeometry(1, 2, 4, 8);
    const playerMaterial = new THREE.MeshLambertMaterial({ color: 0x3b82f6 }); // Primary blue
    const playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
    playerMesh.position.y = 1.5;
    playerMesh.castShadow = true;
    scene.add(playerMesh);
    playerMeshRef.current = playerMesh;

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      
      // Make the camera follow the player
      if (playerMeshRef.current) {
        const target = new THREE.Vector3();
        playerMeshRef.current.getWorldPosition(target);
        
        // Smooth camera following
        camera.position.lerp(
          new THREE.Vector3(target.x, target.y + 10, target.z + 20),
          0.05
        );
        camera.lookAt(target);
      }
      
      renderer.render(scene, camera);
    };

    animate();
    setIsInitialized(true);

    // Handle resize
    const handleResize = () => {
      if (!camera || !renderer || !container) return;
      
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (renderer) {
        container.removeChild(renderer.domElement);
        renderer.dispose();
      }
    };
  }, [containerRef, isInitialized]);

  const updatePlayerPosition = useCallback((position: Vector3, rotation?: number) => {
    if (playerMeshRef.current) {
      playerMeshRef.current.position.set(position.x, position.y + 1.5, position.z);
      if (rotation !== undefined) {
        playerMeshRef.current.rotation.y = rotation;
      }
    }
  }, []);

  const updateOtherPlayers = useCallback((players: GamePlayer[]) => {
    if (!sceneRef.current) return;

    // Remove players no longer online
    const currentPlayerIds = new Set(players.map(p => p.id));
    otherPlayersRef.current.forEach((mesh, playerId) => {
      if (!currentPlayerIds.has(playerId)) {
        sceneRef.current!.remove(mesh);
        otherPlayersRef.current.delete(playerId);
      }
    });

    // Add or update players
    players.forEach(player => {
      let mesh = otherPlayersRef.current.get(player.id);
      
      if (!mesh) {
        const geometry = new THREE.CapsuleGeometry(1, 2, 4, 8);
        const material = new THREE.MeshLambertMaterial({ color: 0x10b981 }); // Accent color
        mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        sceneRef.current!.add(mesh);
        otherPlayersRef.current.set(player.id, mesh);
        
        // Add name label
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = 256;
        canvas.height = 64;
        context.fillStyle = 'rgba(0, 0, 0, 0.8)';
        context.fillRect(0, 0, 256, 64);
        context.fillStyle = 'white';
        context.font = '16px Arial';
        context.textAlign = 'center';
        context.fillText(player.characterName, 128, 40);
        
        const texture = new THREE.CanvasTexture(canvas);
        const labelMaterial = new THREE.MeshBasicMaterial({ 
          map: texture, 
          transparent: true 
        });
        const labelGeometry = new THREE.PlaneGeometry(4, 1);
        const label = new THREE.Mesh(labelGeometry, labelMaterial);
        label.position.y = 3;
        mesh.add(label);
      }
      
      mesh.position.set(player.positionX, player.positionY + 1.5, player.positionZ);
      mesh.rotation.y = player.rotationY;
    });
  }, []);

  const addMonster = useCallback((monster: Monster) => {
    if (!sceneRef.current) return;

    const geometry = new THREE.BoxGeometry(2, 3, 2);
    const material = new THREE.MeshLambertMaterial({ color: 0xdc2626 }); // Red for monsters
    const mesh = new THREE.Mesh(geometry, material);
    
    mesh.position.set(monster.positionX, monster.positionY + 1.5, monster.positionZ);
    mesh.castShadow = true;
    
    sceneRef.current.add(mesh);
    monstersRef.current.set(monster.id, mesh);
  }, []);

  const removeMonster = useCallback((monsterId: string) => {
    const mesh = monstersRef.current.get(monsterId);
    if (mesh && sceneRef.current) {
      sceneRef.current.remove(mesh);
      monstersRef.current.delete(monsterId);
    }
  }, []);

  const addLoot = useCallback((loot: WorldLoot) => {
    if (!sceneRef.current) return;

    // Create glowing loot orb
    const geometry = new THREE.SphereGeometry(0.3, 8, 6);
    const material = new THREE.MeshBasicMaterial({ 
      color: loot.item.rarity === 'common' ? 0x10b981 : 0x3b82f6,
      transparent: true,
      opacity: 0.8
    });
    const mesh = new THREE.Mesh(geometry, material);
    
    mesh.position.set(loot.positionX, loot.positionY + 0.5, loot.positionZ);
    
    // Add floating animation
    const originalY = loot.positionY + 0.5;
    const animateLoot = () => {
      if (mesh.parent) {
        mesh.position.y = originalY + Math.sin(Date.now() * 0.003) * 0.2;
        mesh.rotation.y += 0.02;
        requestAnimationFrame(animateLoot);
      }
    };
    animateLoot();
    
    sceneRef.current.add(mesh);
    lootRef.current.set(loot.id, mesh);
  }, []);

  const removeLoot = useCallback((lootId: string) => {
    const mesh = lootRef.current.get(lootId);
    if (mesh && sceneRef.current) {
      sceneRef.current.remove(mesh);
      lootRef.current.delete(lootId);
    }
  }, []);

  const getCameraTarget = useCallback((): Vector3 | null => {
    if (!cameraRef.current) return null;
    
    const target = new THREE.Vector3();
    cameraRef.current.getWorldDirection(target);
    return { x: target.x, y: target.y, z: target.z };
  }, []);

  return {
    scene: sceneRef.current,
    camera: cameraRef.current,
    renderer: rendererRef.current,
    playerMesh: playerMeshRef.current,
    updatePlayerPosition,
    updateOtherPlayers,
    addMonster,
    removeMonster,
    addLoot,
    removeLoot,
    getCameraTarget,
  };
}
