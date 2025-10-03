import { IStorage } from "./storage";
import { Monster, Player } from "@shared/schema";

interface AbilityResult {
  success: boolean;
  damage?: number;
  abilityUsed: string;
  playerId: string;
  targetId?: string;
  message: string;
  auraCost: number;
}

interface AbilityDefinition {
  name: string;
  auraCost: number;
  damage: number;
  range: number;
  cooldown: number;
  requiredLevel: number;
}

export class GameEngine {
  private storage: IStorage;
  private abilities: Map<string, AbilityDefinition> = new Map();
  private playerCooldowns: Map<string, Map<string, number>> = new Map();

  constructor(storage: IStorage) {
    this.storage = storage;
    this.initializeAbilities();
  }

  private initializeAbilities() {
    // Define abilities from the Sword King universe
    this.abilities.set("stone_bullet", {
      name: "Stone Bullet",
      auraCost: 50,
      damage: 150,
      range: 30,
      cooldown: 2000, // 2 seconds
      requiredLevel: 1,
    });

    this.abilities.set("wind_manipulation", {
      name: "Wind Manipulation",
      auraCost: 75,
      damage: 200,
      range: 15,
      cooldown: 3000, // 3 seconds
      requiredLevel: 15,
    });

    this.abilities.set("ground_dig_up", {
      name: "Ground Dig-Up",
      auraCost: 100,
      damage: 300,
      range: 10,
      cooldown: 5000, // 5 seconds
      requiredLevel: 60,
    });

    this.abilities.set("aura_release", {
      name: "Aura Release",
      auraCost: 200,
      damage: 500,
      range: 25,
      cooldown: 10000, // 10 seconds
      requiredLevel: 85,
    });
  }

  async useAbility(playerId: string, abilityName: string, targetId?: string): Promise<AbilityResult> {
    const player = await this.storage.getPlayer(playerId);
    if (!player) {
      return {
        success: false,
        abilityUsed: abilityName,
        playerId,
        message: "Player not found",
        auraCost: 0,
      };
    }

    const ability = this.abilities.get(abilityName.toLowerCase().replace(" ", "_"));
    if (!ability) {
      return {
        success: false,
        abilityUsed: abilityName,
        playerId,
        message: "Unknown ability",
        auraCost: 0,
      };
    }

    // Check level requirement
    if (player.level < ability.requiredLevel) {
      return {
        success: false,
        abilityUsed: abilityName,
        playerId,
        message: `Requires level ${ability.requiredLevel}`,
        auraCost: ability.auraCost,
      };
    }

    // Check aura cost
    if (player.aura < ability.auraCost) {
      return {
        success: false,
        abilityUsed: abilityName,
        playerId,
        message: "Not enough aura",
        auraCost: ability.auraCost,
      };
    }

    // Check cooldown
    if (this.isOnCooldown(playerId, abilityName)) {
      const remainingTime = this.getRemainingCooldown(playerId, abilityName);
      return {
        success: false,
        abilityUsed: abilityName,
        playerId,
        message: `Ability on cooldown (${remainingTime}ms remaining)`,
        auraCost: ability.auraCost,
      };
    }

    // Calculate damage with hidden stats
    const totalDamage = ability.damage + Math.floor(player.hiddenStrength * 0.1);

    // Apply aura cost
    await this.storage.updatePlayer(playerId, {
      aura: player.aura - ability.auraCost,
    });

    // Set cooldown
    this.setCooldown(playerId, abilityName, ability.cooldown);

    // Handle target damage if targetId provided
    if (targetId) {
      const monster = await this.findNearbyMonster(player, targetId);
      if (monster) {
        const newHealth = Math.max(0, monster.health - totalDamage);
        await this.storage.updateMonster(monster.id, { health: newHealth });
        
        if (newHealth <= 0) {
          await this.storage.deleteMonster(monster.id);
          // Award experience
          const expGain = Math.floor(monster.level * 10 * (1 + player.rebirthCycle * 0.1));
          await this.awardExperience(player, expGain);
          
          // Drop loot
          await this.dropLoot(monster, player.id);
        }
      }
    }

    return {
      success: true,
      damage: totalDamage,
      abilityUsed: abilityName,
      playerId,
      targetId,
      message: `Used ${ability.name} for ${totalDamage} damage`,
      auraCost: ability.auraCost,
    };
  }

  private isOnCooldown(playerId: string, abilityName: string): boolean {
    const playerCooldowns = this.playerCooldowns.get(playerId);
    if (!playerCooldowns) return false;

    const cooldownEnd = playerCooldowns.get(abilityName);
    return cooldownEnd ? Date.now() < cooldownEnd : false;
  }

  private getRemainingCooldown(playerId: string, abilityName: string): number {
    const playerCooldowns = this.playerCooldowns.get(playerId);
    if (!playerCooldowns) return 0;

    const cooldownEnd = playerCooldowns.get(abilityName);
    return cooldownEnd ? Math.max(0, cooldownEnd - Date.now()) : 0;
  }

  private setCooldown(playerId: string, abilityName: string, duration: number): void {
    if (!this.playerCooldowns.has(playerId)) {
      this.playerCooldowns.set(playerId, new Map());
    }
    
    const playerCooldowns = this.playerCooldowns.get(playerId)!;
    playerCooldowns.set(abilityName, Date.now() + duration);
  }

  private async findNearbyMonster(player: Player, targetId: string): Promise<Monster | undefined> {
    const monsters = await this.storage.getMonstersInZone("selha_latna");
    return monsters.find(m => m.id === targetId && this.isInRange(player, m, 50));
  }

  private isInRange(player: Player, monster: Monster, range: number): boolean {
    const dx = player.positionX - monster.positionX;
    const dy = player.positionY - monster.positionY;
    const dz = player.positionZ - monster.positionZ;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    return distance <= range;
  }

  private async awardExperience(player: Player, exp: number): Promise<void> {
    const newExp = player.experience + exp;
    const newLevel = Math.floor(newExp / 100) + 1; // Simple level formula
    
    const updates: Partial<Player> = { experience: newExp };
    
    if (newLevel > player.level && newLevel <= 100) {
      updates.level = newLevel;
      // Increase max health and aura on level up
      updates.maxHealth = 1000 + (newLevel * 50);
      updates.maxAura = 500 + (newLevel * 25);
      updates.health = updates.maxHealth; // Full heal on level up
      updates.aura = updates.maxAura;
    }
    
    await this.storage.updatePlayer(player.id, updates);
  }

  async spawnMonster(zone: string, level: number, difficultyMultiplier: number = 1.0): Promise<Monster> {
    const monsterTypes = ["Stone Golem", "Shadow Wolf", "Crystal Spider", "Wind Elemental"];
    const randomType = monsterTypes[Math.floor(Math.random() * monsterTypes.length)];
    
    const baseHealth = level * 100;
    const scaledHealth = Math.floor(baseHealth * difficultyMultiplier);
    
    // Random position in zone
    const x = Math.random() * 200 - 100;
    const z = Math.random() * 200 - 100;
    
    return await this.storage.createMonster({
      name: randomType,
      level,
      health: scaledHealth,
      maxHealth: scaledHealth,
      positionX: x,
      positionY: 0,
      positionZ: z,
      zone,
      difficultyMultiplier,
    });
  }

  async dropLoot(monster: Monster, killerId: string): Promise<void> {
    // Get all available loot items
    const allLootItems = await this.storage.getAllLootItems();
    const boneItem = allLootItems.find(item => item.name === 'Monster Bone');
    const meatItem = allLootItems.find(item => item.name === 'Monster Meat');
    
    if (!boneItem || !meatItem) {
      console.warn("Loot items not found in database");
      return;
    }

    // Drop chance based on monster level and type
    const dropChance = Math.min(0.8, 0.3 + (monster.level * 0.01)); // 30% base + 1% per level, max 80%
    
    const drops: Array<{ itemId: string; quantity: number }> = [];
    
    // Bones drop more commonly
    if (Math.random() < dropChance) {
      const boneQuantity = Math.floor(Math.random() * 3) + 1; // 1-3 bones
      drops.push({ itemId: boneItem.id, quantity: boneQuantity });
    }
    
    // Meat drops less commonly but gives better regen
    if (Math.random() < dropChance * 0.6) {
      const meatQuantity = Math.floor(Math.random() * 2) + 1; // 1-2 meat
      drops.push({ itemId: meatItem.id, quantity: meatQuantity });
    }

    // Create world loot objects near monster position
    for (const drop of drops) {
      // Random position near monster (within 5 units)
      const offsetX = (Math.random() - 0.5) * 10;
      const offsetZ = (Math.random() - 0.5) * 10;
      
      await this.storage.createWorldLoot({
        itemId: drop.itemId,
        quantity: drop.quantity,
        positionX: monster.positionX + offsetX,
        positionY: monster.positionY,
        positionZ: monster.positionZ + offsetZ,
        zone: monster.zone,
        droppedBy: killerId,
      });
    }
  }

  start(): void {
    console.log("Game Engine started");
    
    // Spawn monsters periodically
    setInterval(async () => {
      try {
        const onlinePlayers = await this.storage.getOnlinePlayers();
        if (onlinePlayers.length > 0) {
          // Calculate average rebirth cycle for difficulty scaling
          const avgRebirthCycle = onlinePlayers.reduce((sum, p) => sum + p.rebirthCycle, 0) / onlinePlayers.length;
          const difficultyMultiplier = 1 + (avgRebirthCycle * 0.5);
          
          const monsters = await this.storage.getMonstersInZone("selha_latna");
          const maxMonsters = Math.min(20, onlinePlayers.length * 3);
          
          if (monsters.length < maxMonsters) {
            const level = Math.floor(Math.random() * 90) + 10; // Level 10-99
            await this.spawnMonster("selha_latna", level, difficultyMultiplier);
          }
        }
      } catch (error) {
        console.error("Monster spawn error:", error);
      }
    }, 30000); // Every 30 seconds
    
    // Regenerate player aura/health
    setInterval(async () => {
      try {
        const onlinePlayers = await this.storage.getOnlinePlayers();
        for (const player of onlinePlayers) {
          const healthRegen = Math.min(player.maxHealth, player.health + Math.floor(player.maxHealth * 0.01));
          const auraRegen = Math.min(player.maxAura, player.aura + Math.floor(player.maxAura * 0.02));
          
          if (healthRegen !== player.health || auraRegen !== player.aura) {
            await this.storage.updatePlayer(player.id, {
              health: healthRegen,
              aura: auraRegen,
            });
          }
        }
      } catch (error) {
        console.error("Regeneration error:", error);
      }
    }, 5000); // Every 5 seconds
    
    // Cleanup expired loot periodically
    setInterval(async () => {
      try {
        await this.storage.cleanupExpiredLoot();
      } catch (error) {
        console.error("Loot cleanup error:", error);
      }
    }, 60000); // Every minute
  }
}
