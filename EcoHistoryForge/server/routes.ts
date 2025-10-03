import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertPlayerSchema, insertChatMessageSchema } from "@shared/schema";
import { GameEngine } from "./gameEngine.js";

interface AuthenticatedWebSocket extends WebSocket {
  playerId?: string;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const gameEngine = new GameEngine(storage);
  
  // WebSocket server for real-time multiplayer
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Player authentication and registration
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertPlayerSchema.parse(req.body);
      
      // Check if username exists
      const existingPlayer = await storage.getPlayerByUsername(userData.username);
      if (existingPlayer) {
        return res.status(409).json({ message: "Username already exists" });
      }
      
      const player = await storage.createPlayer(userData);
      
      // Create initial game state and resources
      await storage.createGameState({
        playerId: player.id,
        currentZone: "selha_latna",
        activeQuests: [],
        inventory: [],
        equipment: {},
        combatState: {},
      });
      
      await storage.createCommunityResources({
        playerId: player.id,
        food: 100,
        materials: 50,
        sustainability: 50,
      });
      
      res.json({ player });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      const player = await storage.getPlayerByUsername(username);
      if (!player || player.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      await storage.setPlayerOnlineStatus(player.id, true);
      res.json({ player });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Game state endpoints
  app.get("/api/game/state/:playerId", async (req, res) => {
    try {
      const gameState = await storage.getGameState(req.params.playerId);
      if (!gameState) {
        return res.status(404).json({ message: "Game state not found" });
      }
      res.json(gameState);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get("/api/game/resources/:playerId", async (req, res) => {
    try {
      const resources = await storage.getCommunityResources(req.params.playerId);
      if (!resources) {
        return res.status(404).json({ message: "Resources not found" });
      }
      res.json(resources);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.post("/api/game/rebirth/:playerId", async (req, res) => {
    try {
      const player = await storage.getPlayer(req.params.playerId);
      if (!player) {
        return res.status(404).json({ message: "Player not found" });
      }
      
      if (player.level < 100) {
        return res.status(400).json({ message: "Must reach level 100 to rebirth" });
      }
      
      const reborntPlayer = await storage.performRebirth(player.id);
      
      // Broadcast rebirth to other players
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'player_rebirth',
            data: { playerId: player.id, newCycle: reborntPlayer.rebirthCycle }
          }));
        }
      });
      
      res.json({ player: reborntPlayer });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Chat endpoints
  app.get("/api/chat/:channel", async (req, res) => {
    try {
      const messages = await storage.getChatMessages(req.params.channel);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Online players
  app.get("/api/players/online", async (req, res) => {
    try {
      const players = await storage.getOnlinePlayers();
      res.json(players);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Inventory endpoints
  app.get("/api/inventory/:playerId", async (req, res) => {
    try {
      const inventory = await storage.getPlayerInventory(req.params.playerId);
      res.json(inventory);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/inventory/use/:playerId", async (req, res) => {
    try {
      const { itemId, quantity = 1 } = req.body;
      const result = await storage.useItem(req.params.playerId, itemId, quantity);
      
      if (result.success) {
        res.json({ 
          message: `Item used successfully`, 
          effects: result.effects 
        });
      } else {
        res.status(400).json({ message: "Could not use item" });
      }
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // World loot endpoints
  app.get("/api/loot/:zone", async (req, res) => {
    try {
      const loot = await storage.getWorldLootInZone(req.params.zone);
      res.json(loot);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/loot/collect/:playerId/:lootId", async (req, res) => {
    try {
      const success = await storage.collectWorldLoot(req.params.playerId, req.params.lootId);
      
      if (success) {
        res.json({ message: "Loot collected successfully" });
      } else {
        res.status(400).json({ message: "Could not collect loot" });
      }
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Combat actions
  app.post("/api/combat/ability/:playerId", async (req, res) => {
    try {
      const { abilityName, targetId } = req.body;
      const result = await gameEngine.useAbility(req.params.playerId, abilityName, targetId);
      
      // Broadcast combat action to nearby players
      wss.clients.forEach((client: AuthenticatedWebSocket) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'combat_action',
            data: result
          }));
        }
      });
      
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // WebSocket handling
  wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
    console.log('New WebSocket connection');
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'authenticate':
            ws.playerId = message.playerId;
            await storage.setPlayerOnlineStatus(message.playerId, true);
            break;
            
          case 'chat_message':
            const chatMessage = await storage.createChatMessage({
              playerId: ws.playerId!,
              message: message.data.message,
              channel: message.data.channel || 'tutorial',
            });
            
            // Broadcast to all clients in the same channel
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'chat_message',
                  data: chatMessage
                }));
              }
            });
            break;
            
          case 'player_move':
            if (ws.playerId) {
              await storage.updatePlayerPosition(
                ws.playerId,
                message.data.x,
                message.data.y,
                message.data.z,
                message.data.rotation
              );
              
              // Broadcast position update to other players
              wss.clients.forEach((client: AuthenticatedWebSocket) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({
                    type: 'player_position',
                    data: {
                      playerId: ws.playerId,
                      ...message.data
                    }
                  }));
                }
              });
            }
            break;
            
          case 'use_ability':
            if (ws.playerId) {
              const result = await gameEngine.useAbility(
                ws.playerId,
                message.data.abilityName,
                message.data.targetId
              );
              
              // Send result back to user
              ws.send(JSON.stringify({
                type: 'ability_result',
                data: result
              }));
              
              // Broadcast to other players if successful
              if (result.success) {
                wss.clients.forEach((client: AuthenticatedWebSocket) => {
                  if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                      type: 'combat_action',
                      data: result
                    }));
                  }
                });
              }
            }
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          data: { message: 'Invalid message format' }
        }));
      }
    });
    
    ws.on('close', async () => {
      if (ws.playerId) {
        await storage.setPlayerOnlineStatus(ws.playerId, false);
        console.log(`Player ${ws.playerId} disconnected`);
      }
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
  
  // Start game engine
  gameEngine.start();
  
  return httpServer;
}
