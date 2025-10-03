import { 
  players, 
  chatMessages, 
  communityResources, 
  gameState, 
  monsters,
  lootItems,
  playerInventory,
  worldLoot,
  type Player, 
  type InsertPlayer,
  type ChatMessage,
  type InsertChatMessage,
  type CommunityResources,
  type InsertCommunityResources,
  type GameState,
  type InsertGameState,
  type Monster,
  type InsertMonster,
  type LootItem,
  type InsertLootItem,
  type PlayerInventory,
  type InsertPlayerInventory,
  type WorldLoot,
  type InsertWorldLoot
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // Player management
  getPlayer(id: string): Promise<Player | undefined>;
  getPlayerByUsername(username: string): Promise<Player | undefined>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  updatePlayer(id: string, updates: Partial<Player>): Promise<Player>;
  updatePlayerPosition(id: string, x: number, y: number, z: number, rotation?: number): Promise<void>;
  setPlayerOnlineStatus(id: string, isOnline: boolean): Promise<void>;
  getOnlinePlayers(): Promise<Player[]>;
  
  // Chat system
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(channel: string, limit?: number): Promise<ChatMessage[]>;
  
  // Community resources
  getCommunityResources(playerId: string): Promise<CommunityResources | undefined>;
  createCommunityResources(resources: InsertCommunityResources): Promise<CommunityResources>;
  updateCommunityResources(playerId: string, updates: Partial<CommunityResources>): Promise<CommunityResources>;
  
  // Game state
  getGameState(playerId: string): Promise<GameState | undefined>;
  createGameState(gameState: InsertGameState): Promise<GameState>;
  updateGameState(playerId: string, updates: Partial<GameState>): Promise<GameState>;
  
  // Monster system
  createMonster(monster: InsertMonster): Promise<Monster>;
  getMonstersInZone(zone: string): Promise<Monster[]>;
  updateMonster(id: string, updates: Partial<Monster>): Promise<Monster>;
  deleteMonster(id: string): Promise<void>;
  
  // Rebirth system
  performRebirth(playerId: string): Promise<Player>;
  
  // Loot system
  createLootItem(item: InsertLootItem): Promise<LootItem>;
  getLootItem(id: string): Promise<LootItem | undefined>;
  getAllLootItems(): Promise<LootItem[]>;
  
  // Player inventory
  getPlayerInventory(playerId: string): Promise<(PlayerInventory & { item: LootItem })[]>;
  addToInventory(playerId: string, itemId: string, quantity?: number): Promise<PlayerInventory>;
  removeFromInventory(playerId: string, itemId: string, quantity?: number): Promise<boolean>;
  useItem(playerId: string, itemId: string, quantity?: number): Promise<{ success: boolean; effects: any }>;
  
  // World loot
  createWorldLoot(loot: InsertWorldLoot): Promise<WorldLoot>;
  getWorldLootInZone(zone: string): Promise<(WorldLoot & { item: LootItem })[]>;
  collectWorldLoot(playerId: string, lootId: string): Promise<boolean>;
  cleanupExpiredLoot(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getPlayer(id: string): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(eq(players.id, id));
    return player || undefined;
  }

  async getPlayerByUsername(username: string): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(eq(players.username, username));
    return player || undefined;
  }

  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const [player] = await db
      .insert(players)
      .values(insertPlayer)
      .returning();
    return player;
  }

  async updatePlayer(id: string, updates: Partial<Player>): Promise<Player> {
    const [player] = await db
      .update(players)
      .set(updates)
      .where(eq(players.id, id))
      .returning();
    return player;
  }

  async updatePlayerPosition(id: string, x: number, y: number, z: number, rotation?: number): Promise<void> {
    const updates: any = { positionX: x, positionY: y, positionZ: z };
    if (rotation !== undefined) {
      updates.rotationY = rotation;
    }
    
    await db
      .update(players)
      .set(updates)
      .where(eq(players.id, id));
  }

  async setPlayerOnlineStatus(id: string, isOnline: boolean): Promise<void> {
    await db
      .update(players)
      .set({ 
        isOnline, 
        lastSeen: isOnline ? undefined : sql`now()` 
      })
      .where(eq(players.id, id));
  }

  async getOnlinePlayers(): Promise<Player[]> {
    return await db
      .select()
      .from(players)
      .where(eq(players.isOnline, true));
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const [message] = await db
      .insert(chatMessages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async getChatMessages(channel: string, limit: number = 50): Promise<ChatMessage[]> {
    return await db
      .select({
        id: chatMessages.id,
        playerId: chatMessages.playerId,
        message: chatMessages.message,
        channel: chatMessages.channel,
        createdAt: chatMessages.createdAt,
        playerName: players.characterName,
      })
      .from(chatMessages)
      .innerJoin(players, eq(chatMessages.playerId, players.id))
      .where(eq(chatMessages.channel, channel))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit) as ChatMessage[];
  }

  async getCommunityResources(playerId: string): Promise<CommunityResources | undefined> {
    const [resources] = await db
      .select()
      .from(communityResources)
      .where(eq(communityResources.playerId, playerId));
    return resources || undefined;
  }

  async createCommunityResources(insertResources: InsertCommunityResources): Promise<CommunityResources> {
    const [resources] = await db
      .insert(communityResources)
      .values(insertResources)
      .returning();
    return resources;
  }

  async updateCommunityResources(playerId: string, updates: Partial<CommunityResources>): Promise<CommunityResources> {
    const [resources] = await db
      .update(communityResources)
      .set({ ...updates, lastUpdated: sql`now()` })
      .where(eq(communityResources.playerId, playerId))
      .returning();
    return resources;
  }

  async getGameState(playerId: string): Promise<GameState | undefined> {
    const [state] = await db
      .select()
      .from(gameState)
      .where(eq(gameState.playerId, playerId));
    return state || undefined;
  }

  async createGameState(insertGameState: InsertGameState): Promise<GameState> {
    const [state] = await db
      .insert(gameState)
      .values(insertGameState)
      .returning();
    return state;
  }

  async updateGameState(playerId: string, updates: Partial<GameState>): Promise<GameState> {
    const [state] = await db
      .update(gameState)
      .set({ ...updates, lastSaved: sql`now()` })
      .where(eq(gameState.playerId, playerId))
      .returning();
    return state;
  }

  async createMonster(insertMonster: InsertMonster): Promise<Monster> {
    const [monster] = await db
      .insert(monsters)
      .values(insertMonster)
      .returning();
    return monster;
  }

  async getMonstersInZone(zone: string): Promise<Monster[]> {
    return await db
      .select()
      .from(monsters)
      .where(and(
        eq(monsters.zone, zone),
        eq(monsters.isAlive, true)
      ));
  }

  async updateMonster(id: string, updates: Partial<Monster>): Promise<Monster> {
    const [monster] = await db
      .update(monsters)
      .set(updates)
      .where(eq(monsters.id, id))
      .returning();
    return monster;
  }

  async deleteMonster(id: string): Promise<void> {
    await db
      .update(monsters)
      .set({ isAlive: false })
      .where(eq(monsters.id, id));
  }

  async performRebirth(playerId: string): Promise<Player> {
    const player = await this.getPlayer(playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    // Accumulate hidden stats based on current stats
    const statGains = Math.floor(player.level * 10); // Example formula
    
    const [updatedPlayer] = await db
      .update(players)
      .set({
        level: 1,
        experience: 0,
        rebirthCycle: player.rebirthCycle + 1,
        health: 1000,
        maxHealth: 1000,
        aura: 500,
        maxAura: 500,
        hiddenStrength: player.hiddenStrength + statGains,
        hiddenAgility: player.hiddenAgility + statGains,
        hiddenIntelligence: player.hiddenIntelligence + statGains,
        hiddenEndurance: player.hiddenEndurance + statGains,
      })
      .where(eq(players.id, playerId))
      .returning();

    return updatedPlayer;
  }

  // Loot system implementation
  async createLootItem(insertItem: InsertLootItem): Promise<LootItem> {
    const [item] = await db
      .insert(lootItems)
      .values(insertItem)
      .returning();
    return item;
  }

  async getLootItem(id: string): Promise<LootItem | undefined> {
    const [item] = await db.select().from(lootItems).where(eq(lootItems.id, id));
    return item || undefined;
  }

  async getAllLootItems(): Promise<LootItem[]> {
    return await db.select().from(lootItems);
  }

  // Player inventory implementation
  async getPlayerInventory(playerId: string): Promise<(PlayerInventory & { item: LootItem })[]> {
    return await db
      .select({
        id: playerInventory.id,
        playerId: playerInventory.playerId,
        itemId: playerInventory.itemId,
        quantity: playerInventory.quantity,
        acquiredAt: playerInventory.acquiredAt,
        item: lootItems,
      })
      .from(playerInventory)
      .innerJoin(lootItems, eq(playerInventory.itemId, lootItems.id))
      .where(eq(playerInventory.playerId, playerId)) as (PlayerInventory & { item: LootItem })[];
  }

  async addToInventory(playerId: string, itemId: string, quantity: number = 1): Promise<PlayerInventory> {
    // Check if item already exists in inventory
    const [existing] = await db
      .select()
      .from(playerInventory)
      .where(and(
        eq(playerInventory.playerId, playerId),
        eq(playerInventory.itemId, itemId)
      ));

    if (existing) {
      // Update existing stack
      const [updated] = await db
        .update(playerInventory)
        .set({ quantity: existing.quantity + quantity })
        .where(eq(playerInventory.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new inventory entry
      const [newEntry] = await db
        .insert(playerInventory)
        .values({ playerId, itemId, quantity })
        .returning();
      return newEntry;
    }
  }

  async removeFromInventory(playerId: string, itemId: string, quantity: number = 1): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(playerInventory)
      .where(and(
        eq(playerInventory.playerId, playerId),
        eq(playerInventory.itemId, itemId)
      ));

    if (!existing || existing.quantity < quantity) {
      return false;
    }

    if (existing.quantity === quantity) {
      // Remove entirely
      await db
        .delete(playerInventory)
        .where(eq(playerInventory.id, existing.id));
    } else {
      // Reduce quantity
      await db
        .update(playerInventory)
        .set({ quantity: existing.quantity - quantity })
        .where(eq(playerInventory.id, existing.id));
    }

    return true;
  }

  async useItem(playerId: string, itemId: string, quantity: number = 1): Promise<{ success: boolean; effects: any }> {
    const item = await this.getLootItem(itemId);
    if (!item || item.type !== 'consumable') {
      return { success: false, effects: {} };
    }

    const removed = await this.removeFromInventory(playerId, itemId, quantity);
    if (!removed) {
      return { success: false, effects: {} };
    }

    // Apply effects to player
    const effects = item.effects as any;
    const player = await this.getPlayer(playerId);
    if (!player) {
      return { success: false, effects: {} };
    }

    const updates: Partial<Player> = {};
    if (effects.health && typeof effects.health === 'number') {
      updates.health = Math.min(player.maxHealth, player.health + effects.health * quantity);
    }
    if (effects.aura && typeof effects.aura === 'number') {
      updates.aura = Math.min(player.maxAura, player.aura + effects.aura * quantity);
    }

    if (Object.keys(updates).length > 0) {
      await this.updatePlayer(playerId, updates);
    }

    return { success: true, effects: effects };
  }

  // World loot implementation
  async createWorldLoot(insertLoot: InsertWorldLoot): Promise<WorldLoot> {
    const [loot] = await db
      .insert(worldLoot)
      .values(insertLoot)
      .returning();
    return loot;
  }

  async getWorldLootInZone(zone: string): Promise<(WorldLoot & { item: LootItem })[]> {
    return await db
      .select({
        id: worldLoot.id,
        itemId: worldLoot.itemId,
        quantity: worldLoot.quantity,
        positionX: worldLoot.positionX,
        positionY: worldLoot.positionY,
        positionZ: worldLoot.positionZ,
        zone: worldLoot.zone,
        droppedBy: worldLoot.droppedBy,
        spawnedAt: worldLoot.spawnedAt,
        expiresAt: worldLoot.expiresAt,
        item: lootItems,
      })
      .from(worldLoot)
      .innerJoin(lootItems, eq(worldLoot.itemId, lootItems.id))
      .where(and(
        eq(worldLoot.zone, zone),
        sql`${worldLoot.expiresAt} > now()`
      )) as (WorldLoot & { item: LootItem })[];
  }

  async collectWorldLoot(playerId: string, lootId: string): Promise<boolean> {
    const [loot] = await db
      .select({
        id: worldLoot.id,
        itemId: worldLoot.itemId,
        quantity: worldLoot.quantity,
        positionX: worldLoot.positionX,
        positionY: worldLoot.positionY,
        positionZ: worldLoot.positionZ,
        zone: worldLoot.zone,
        droppedBy: worldLoot.droppedBy,
        spawnedAt: worldLoot.spawnedAt,
        expiresAt: worldLoot.expiresAt,
      })
      .from(worldLoot)
      .where(and(
        eq(worldLoot.id, lootId),
        sql`${worldLoot.expiresAt} > now()`
      ));

    if (!loot) {
      return false;
    }

    // Add to player inventory
    await this.addToInventory(playerId, loot.itemId, loot.quantity);

    // Remove from world
    await db.delete(worldLoot).where(eq(worldLoot.id, lootId));

    return true;
  }

  async cleanupExpiredLoot(): Promise<void> {
    await db
      .delete(worldLoot)
      .where(sql`${worldLoot.expiresAt} <= now()`);
  }
}

export const storage = new DatabaseStorage();
