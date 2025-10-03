import { useEffect, useRef } from "react";
import { useGame3D } from "@/hooks/useGame3D";
import { GamePlayer, Monster, WorldLoot } from "@/lib/gameTypes";

interface Game3DProps {
  player?: GamePlayer;
  onlinePlayers: GamePlayer[];
  monsters: Monster[];
  worldLoot: WorldLoot[];
  onPlayerMove?: (x: number, y: number, z: number, rotation?: number) => void;
  onCollectLoot?: (lootId: string) => void;
}

export function Game3D({ player, onlinePlayers, monsters, worldLoot, onPlayerMove, onCollectLoot }: Game3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { 
    updatePlayerPosition, 
    updateOtherPlayers, 
    addMonster, 
    removeMonster,
    addLoot,
    removeLoot
  } = useGame3D(containerRef);
  
  const keysPressed = useRef(new Set<string>());
  const currentPosition = useRef({ x: 0, y: 0, z: 0 });
  const currentRotation = useRef(0);

  // Handle keyboard movement
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      keysPressed.current.add(event.code.toLowerCase());
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      keysPressed.current.delete(event.code.toLowerCase());
    };

    // Movement update loop
    const movePlayer = () => {
      if (!player) return;
      
      let moved = false;
      const speed = 0.5;
      const rotationSpeed = 0.05;
      
      if (keysPressed.current.has('keyw')) {
        currentPosition.current.z -= speed * Math.cos(currentRotation.current);
        currentPosition.current.x -= speed * Math.sin(currentRotation.current);
        moved = true;
      }
      if (keysPressed.current.has('keys')) {
        currentPosition.current.z += speed * Math.cos(currentRotation.current);
        currentPosition.current.x += speed * Math.sin(currentRotation.current);
        moved = true;
      }
      if (keysPressed.current.has('keya')) {
        currentRotation.current += rotationSpeed;
        moved = true;
      }
      if (keysPressed.current.has('keyd')) {
        currentRotation.current -= rotationSpeed;
        moved = true;
      }
      
      if (moved) {
        updatePlayerPosition(currentPosition.current, currentRotation.current);
        onPlayerMove?.(
          currentPosition.current.x,
          currentPosition.current.y,
          currentPosition.current.z,
          currentRotation.current
        );
      }
      
      requestAnimationFrame(movePlayer);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    movePlayer();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [player, updatePlayerPosition, onPlayerMove]);

  // Update player position when player data changes
  useEffect(() => {
    if (player) {
      const position = { x: player.positionX, y: player.positionY, z: player.positionZ };
      currentPosition.current = position;
      currentRotation.current = player.rotationY;
      updatePlayerPosition(position, player.rotationY);
    }
  }, [player, updatePlayerPosition]);

  // Update other players
  useEffect(() => {
    updateOtherPlayers(onlinePlayers);
  }, [onlinePlayers, updateOtherPlayers]);

  // Handle monsters
  useEffect(() => {
    monsters.forEach(monster => addMonster(monster));
    
    return () => {
      monsters.forEach(monster => removeMonster(monster.id));
    };
  }, [monsters, addMonster, removeMonster]);

  // Handle world loot
  useEffect(() => {
    worldLoot.forEach(loot => addLoot(loot));
    
    return () => {
      worldLoot.forEach(loot => removeLoot(loot.id));
    };
  }, [worldLoot, addLoot, removeLoot]);

  // Handle loot collection when player presses E near loot
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code.toLowerCase() === 'keye' && player && onCollectLoot) {
        // Find nearest loot within collection range
        const collectionRange = 3;
        for (const loot of worldLoot) {
          const dx = player.positionX - loot.positionX;
          const dy = player.positionY - loot.positionY;
          const dz = player.positionZ - loot.positionZ;
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          if (distance <= collectionRange) {
            onCollectLoot(loot.id);
            break; // Only collect one item at a time
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [player, worldLoot, onCollectLoot]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full relative cursor-crosshair"
      data-testid="game-3d-viewport"
    >
      {/* Tutorial Zone UI Overlay */}
      <div className="absolute top-4 left-4 floating-ui rounded-lg p-3" data-testid="zone-indicator">
        <div className="flex items-center space-x-2">
          <i className="fas fa-map-marker-alt text-destructive"></i>
          <span className="font-medium">Selha Latna - Tutorial Zone</span>
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          Survive until Level 100 to unlock the world
        </div>
      </div>

      {/* Enemy Difficulty Indicator */}
      {player && (
        <div className="absolute top-4 right-4 floating-ui rounded-lg p-3" data-testid="difficulty-indicator">
          <div className="flex items-center space-x-2">
            <i className="fas fa-skull text-destructive"></i>
            <span className="font-medium">Enemy Scaling</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Rebirth Cycle {player.rebirthCycle}: <span className="text-destructive">+{player.rebirthCycle * 50}% Difficulty</span>
          </div>
        </div>
      )}

      {/* Crosshair */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" data-testid="crosshair">
        <div className="w-8 h-8 border border-primary/60 rounded-full flex items-center justify-center">
          <div className="w-2 h-2 bg-primary rounded-full"></div>
        </div>
      </div>

      {/* Movement Controls Help */}
      <div className="absolute bottom-4 left-4 floating-ui rounded-lg p-3" data-testid="controls-help">
        <div className="text-xs text-muted-foreground">
          <div>WASD: Move</div>
          <div>Mouse: Look around</div>
          <div>1-4: Use abilities</div>
          <div>E: Collect loot</div>
        </div>
      </div>

      {/* Minimap */}
      <div className="absolute bottom-4 right-4 w-48 h-32 floating-ui rounded-lg p-2" data-testid="minimap">
        <div className="w-full h-full minimap-grid rounded relative">
          {player && (
            <div 
              className="absolute w-2 h-2 bg-primary rounded-full transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${50 + (player.positionX / 200) * 100}%`,
                top: `${50 + (player.positionZ / 200) * 100}%`
              }}
            />
          )}
          {monsters.map(monster => (
            <div
              key={monster.id}
              className="absolute w-1 h-1 bg-destructive rounded-full transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${50 + (monster.positionX / 200) * 100}%`,
                top: `${50 + (monster.positionZ / 200) * 100}%`
              }}
            />
          ))}
          <div className="absolute top-0 left-0 text-xs text-muted-foreground">Selha Latna</div>
        </div>
      </div>
    </div>
  );
}
