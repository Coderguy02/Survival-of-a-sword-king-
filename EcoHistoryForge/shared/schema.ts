import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const players = pgTable("players", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  characterName: text("character_name").notNull(),
  level: integer("level").notNull().default(1),
  experience: integer("experience").notNull().default(0),
  rebirthCycle: integer("rebirth_cycle").notNull().default(0),
  
  // Current stats (reset on rebirth)
  health: integer("health").notNull().default(1000),
  maxHealth: integer("max_health").notNull().default(1000),
  aura: integer("aura").notNull().default(500),
  maxAura: integer("max_aura").notNull().default(500),
  
  // Hidden accumulated stats (persist through rebirth)
  hiddenStrength: integer("hidden_strength").notNull().default(0),
  hiddenAgility: integer("hidden_agility").notNull().default(0),
  hiddenIntelligence: integer("hidden_intelligence").notNull().default(0),
  hiddenEndurance: integer("hidden_endurance").notNull().default(0),
  
  // Position in 3D world
  positionX: real("position_x").notNull().default(0),
  positionY: real("position_y").notNull().default(0),
  positionZ: real("position_z").notNull().default(0),
  rotationY: real("rotation_y").notNull().default(0),
  
  // Tutorial zone lock
  isInTutorialZone: boolean("is_in_tutorial_zone").notNull().default(true),
  tutorialProgress: integer("tutorial_progress").notNull().default(0),
  
  // Abilities
  unlockedAbilities: jsonb("unlocked_abilities").notNull().default([]),
  
  isOnline: boolean("is_online").notNull().default(false),
  lastSeen: timestamp("last_seen").default(sql`now()`),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull().references(() => players.id),
  message: text("message").notNull(),
  channel: text("channel").notNull().default("tutorial"), // tutorial, world, guild, etc.
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const communityResources = pgTable("community_resources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull().references(() => players.id),
  food: integer("food").notNull().default(0),
  materials: integer("materials").notNull().default(0),
  sustainability: integer("sustainability").notNull().default(0), // percentage
  lastUpdated: timestamp("last_updated").default(sql`now()`),
});

export const gameState = pgTable("game_state", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull().references(() => players.id),
  currentZone: text("current_zone").notNull().default("selha_latna"),
  activeQuests: jsonb("active_quests").notNull().default([]),
  inventory: jsonb("inventory").notNull().default([]),
  equipment: jsonb("equipment").notNull().default({}),
  combatState: jsonb("combat_state").notNull().default({}),
  lastSaved: timestamp("last_saved").default(sql`now()`),
});

export const lootItems = pgTable("loot_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'consumable', 'equipment', 'material'
  rarity: text("rarity").notNull().default("common"), // common, uncommon, rare, epic, legendary
  description: text("description").notNull(),
  effects: jsonb("effects").notNull().default({}), // { health: 100, aura: 50 } for consumables
  value: integer("value").notNull().default(1),
  stackable: boolean("stackable").notNull().default(true),
  maxStack: integer("max_stack").notNull().default(99),
  icon: text("icon").notNull().default("fas fa-cube"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const playerInventory = pgTable("player_inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerId: varchar("player_id").notNull().references(() => players.id),
  itemId: varchar("item_id").notNull().references(() => lootItems.id),
  quantity: integer("quantity").notNull().default(1),
  acquiredAt: timestamp("acquired_at").default(sql`now()`),
});

export const worldLoot = pgTable("world_loot", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  itemId: varchar("item_id").notNull().references(() => lootItems.id),
  quantity: integer("quantity").notNull().default(1),
  positionX: real("position_x").notNull(),
  positionY: real("position_y").notNull(),
  positionZ: real("position_z").notNull(),
  zone: text("zone").notNull().default("selha_latna"),
  droppedBy: varchar("dropped_by"), // playerId who killed the monster
  spawnedAt: timestamp("spawned_at").default(sql`now()`),
  expiresAt: timestamp("expires_at").default(sql`now() + interval '5 minutes'`),
});

export const monsters = pgTable("monsters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  level: integer("level").notNull(),
  health: integer("health").notNull(),
  maxHealth: integer("max_health").notNull(),
  positionX: real("position_x").notNull(),
  positionY: real("position_y").notNull(),
  positionZ: real("position_z").notNull(),
  zone: text("zone").notNull().default("selha_latna"),
  difficultyMultiplier: real("difficulty_multiplier").notNull().default(1.0),
  isAlive: boolean("is_alive").notNull().default(true),
  spawnedAt: timestamp("spawned_at").default(sql`now()`),
});

// Relations
export const playersRelations = relations(players, ({ many, one }) => ({
  chatMessages: many(chatMessages),
  gameState: one(gameState),
  communityResources: one(communityResources),
  inventory: many(playerInventory),
}));

export const lootItemsRelations = relations(lootItems, ({ many }) => ({
  playerInventory: many(playerInventory),
  worldLoot: many(worldLoot),
}));

export const playerInventoryRelations = relations(playerInventory, ({ one }) => ({
  player: one(players, {
    fields: [playerInventory.playerId],
    references: [players.id],
  }),
  item: one(lootItems, {
    fields: [playerInventory.itemId],
    references: [lootItems.id],
  }),
}));

export const worldLootRelations = relations(worldLoot, ({ one }) => ({
  item: one(lootItems, {
    fields: [worldLoot.itemId],
    references: [lootItems.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  player: one(players, {
    fields: [chatMessages.playerId],
    references: [players.id],
  }),
}));

export const communityResourcesRelations = relations(communityResources, ({ one }) => ({
  player: one(players, {
    fields: [communityResources.playerId],
    references: [players.id],
  }),
}));

export const gameStateRelations = relations(gameState, ({ one }) => ({
  player: one(players, {
    fields: [gameState.playerId],
    references: [players.id],
  }),
}));

// Insert schemas
export const insertPlayerSchema = createInsertSchema(players).omit({
  id: true,
  createdAt: true,
  lastSeen: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertCommunityResourcesSchema = createInsertSchema(communityResources).omit({
  id: true,
  lastUpdated: true,
});

export const insertGameStateSchema = createInsertSchema(gameState).omit({
  id: true,
  lastSaved: true,
});

export const insertMonsterSchema = createInsertSchema(monsters).omit({
  id: true,
  spawnedAt: true,
});

export const insertLootItemSchema = createInsertSchema(lootItems).omit({
  id: true,
  createdAt: true,
});

export const insertPlayerInventorySchema = createInsertSchema(playerInventory).omit({
  id: true,
  acquiredAt: true,
});

export const insertWorldLootSchema = createInsertSchema(worldLoot).omit({
  id: true,
  spawnedAt: true,
  expiresAt: true,
});

// Types
export type Player = typeof players.$inferSelect;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type CommunityResources = typeof communityResources.$inferSelect;
export type InsertCommunityResources = z.infer<typeof insertCommunityResourcesSchema>;
export type GameState = typeof gameState.$inferSelect;
export type InsertGameState = z.infer<typeof insertGameStateSchema>;
export type Monster = typeof monsters.$inferSelect;
export type InsertMonster = z.infer<typeof insertMonsterSchema>;
export type LootItem = typeof lootItems.$inferSelect;
export type InsertLootItem = z.infer<typeof insertLootItemSchema>;
export type PlayerInventory = typeof playerInventory.$inferSelect;
export type InsertPlayerInventory = z.infer<typeof insertPlayerInventorySchema>;
export type WorldLoot = typeof worldLoot.$inferSelect;
export type InsertWorldLoot = z.infer<typeof insertWorldLootSchema>;
