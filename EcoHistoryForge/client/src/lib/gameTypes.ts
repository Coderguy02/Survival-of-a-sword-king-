export interface GamePlayer {
  id: string;
  characterName: string;
  level: number;
  experience: number;
  rebirthCycle: number;
  health: number;
  maxHealth: number;
  aura: number;
  maxAura: number;
  hiddenStrength: number;
  hiddenAgility: number;
  hiddenIntelligence: number;
  hiddenEndurance: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationY: number;
  isInTutorialZone: boolean;
  tutorialProgress: number;
  isOnline: boolean;
}

export interface GameState {
  currentZone: string;
  activeQuests: any[];
  inventory: any[];
  equipment: Record<string, any>;
  combatState: Record<string, any>;
}

export interface CommunityResources {
  food: number;
  materials: number;
  sustainability: number;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName?: string;
  message: string;
  channel: string;
  createdAt: Date;
}

export interface Monster {
  id: string;
  name: string;
  level: number;
  health: number;
  maxHealth: number;
  positionX: number;
  positionY: number;
  positionZ: number;
}

export interface AbilityResult {
  success: boolean;
  damage?: number;
  abilityUsed: string;
  playerId: string;
  targetId?: string;
  message: string;
  auraCost: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface LootItem {
  id: string;
  name: string;
  type: string;
  rarity: string;
  description: string;
  effects: Record<string, any>;
  value: number;
  stackable: boolean;
  maxStack: number;
  icon: string;
}

export interface InventoryItem {
  id: string;
  playerId: string;
  itemId: string;
  quantity: number;
  acquiredAt: Date;
  item: LootItem;
}

export interface WorldLoot {
  id: string;
  itemId: string;
  quantity: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  zone: string;
  droppedBy?: string;
  spawnedAt: Date;
  expiresAt: Date;
  item: LootItem;
}
