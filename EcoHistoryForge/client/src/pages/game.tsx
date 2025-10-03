import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Game3D } from "@/components/Game3D";
import { GameHUD } from "@/components/GameHUD";
import { CharacterPanel } from "@/components/CharacterPanel";
import { InventoryPanel } from "@/components/InventoryPanel";
import { MultiplayerPanel } from "@/components/MultiplayerPanel";
import { ChatSystem } from "@/components/ChatSystem";
import { useGameSocket } from "@/hooks/useGameSocket";
import { useToast } from "@/hooks/use-toast";
import { GamePlayer, GameState, CommunityResources, Monster, WorldLoot, InventoryItem } from "@/lib/gameTypes";
import { apiRequest } from "@/lib/queryClient";

// Mock current player - in real app this would come from authentication
const MOCK_PLAYER_ID = "mock-player-123";

export default function GamePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [worldLoot, setWorldLoot] = useState<WorldLoot[]>([]);
  const [showInventory, setShowInventory] = useState(false);
  const [buff, setBuff] = useState<{ type: string; value: number; unlimited?: boolean } | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState("");
  
  const {
    isConnected,
    onlinePlayers,
    chatMessages,
    sendChatMessage,
    sendPlayerMove,
    sendUseAbility,
    authenticate
  } = useGameSocket();

  // Fetch player data
  const { data: player, isLoading: playerLoading } = useQuery<GamePlayer>({
    queryKey: ["/api/players", MOCK_PLAYER_ID],
    enabled: true,
  });

  // Fetch game state
  const { data: gameState } = useQuery<GameState>({
    queryKey: ["/api/game/state", MOCK_PLAYER_ID],
    enabled: !!player,
  });

  // Fetch community resources
  const { data: resources } = useQuery<CommunityResources>({
    queryKey: ["/api/game/resources", MOCK_PLAYER_ID],
    enabled: !!player,
  });

  // Fetch online players
  const { data: allOnlinePlayers = [] } = useQuery<GamePlayer[]>({
    queryKey: ["/api/players/online"],
    refetchInterval: 10000, // Update every 10 seconds
  });

  // Fetch chat messages
  const { data: initialChatMessages = [] } = useQuery({
    queryKey: ["/api/chat/tutorial"],
    enabled: true,
  });

  // Fetch player inventory
  const { data: inventory = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory", MOCK_PLAYER_ID],
    enabled: !!player,
  });

  // Fetch world loot
  const { data: lootData } = useQuery<WorldLoot[]>({
    queryKey: ["/api/loot/tutorial"],
    enabled: !!player,
    refetchInterval: 5000, // Update every 5 seconds for new loot
  });

  // Use ability mutation
  const useAbilityMutation = useMutation({
    mutationFn: async (data: { abilityName: string; targetId?: string }) => {
      return apiRequest("POST", `/api/combat/ability/${MOCK_PLAYER_ID}`, data);
    },
    onSuccess: (response: any) => {
      toast({
        title: "Ability Used",
        description: response?.message || "Ability executed successfully",
      });
      
      // Refetch player data to update aura
      queryClient.invalidateQueries({ queryKey: ["/api/players", MOCK_PLAYER_ID] });
    },
    onError: (error: any) => {
      toast({
        title: "Ability Failed",
        description: error.message || "Could not use ability",
        variant: "destructive",
      });
    },
  });

  // Rebirth mutation
  const rebirthMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/game/rebirth/${MOCK_PLAYER_ID}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Rebirth Complete!",
        description: "You have been reborn with enhanced hidden stats. Your journey begins anew.",
      });
      
      // Refetch all player data
      queryClient.invalidateQueries({ queryKey: ["/api/players", MOCK_PLAYER_ID] });
      queryClient.invalidateQueries({ queryKey: ["/api/game/state", MOCK_PLAYER_ID] });
    },
    onError: (error: any) => {
      toast({
        title: "Rebirth Failed",
        description: error.message || "Could not perform rebirth",
        variant: "destructive",
      });
    },
  });

  // Collect loot mutation
  const collectLootMutation = useMutation({
    mutationFn: async (lootId: string) => {
      return apiRequest("POST", `/api/loot/collect/${MOCK_PLAYER_ID}`, { lootId });
    },
    onSuccess: () => {
      toast({
        title: "Loot Collected",
        description: "Item added to your inventory!",
      });
      
      // Refetch inventory and world loot
      queryClient.invalidateQueries({ queryKey: ["/api/inventory", MOCK_PLAYER_ID] });
      queryClient.invalidateQueries({ queryKey: ["/api/loot/world"] });
    },
    onError: (error: any) => {
      toast({
        title: "Collection Failed",
        description: error?.message || "Unable to collect loot",
        variant: "destructive",
      });
    },
  });

  // Use item mutation
  const useItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return apiRequest("POST", `/api/inventory/use/${MOCK_PLAYER_ID}`, { itemId });
    },
    onSuccess: () => {
      toast({
        title: "Item Used",
        description: "Health and aura restored!",
      });
      
      // Refetch player data and inventory
      queryClient.invalidateQueries({ queryKey: ["/api/players", MOCK_PLAYER_ID] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory", MOCK_PLAYER_ID] });
    },
    onError: (error: any) => {
      toast({
        title: "Usage Failed",
        description: error?.message || "Unable to use item",
        variant: "destructive",
      });
    },
  });

  // Authenticate with WebSocket when player loads
  useEffect(() => {
    if (player && isConnected) {
      authenticate(player.id);
    }
  }, [player, isConnected, authenticate]);

  // Update world loot when data changes
  useEffect(() => {
    if (lootData) {
      setWorldLoot(lootData);
    }
  }, [lootData]);

  // Mock some monsters for the 3D view
  useEffect(() => {
    const mockMonsters: Monster[] = [
      {
        id: "monster-1",
        name: "Stone Golem",
        level: 89,
        health: 4500,
        maxHealth: 10000,
        positionX: -20,
        positionY: 0,
        positionZ: 15,
      },
      {
        id: "monster-2", 
        name: "Shadow Wolf",
        level: 45,
        health: 2300,
        maxHealth: 4500,
        positionX: 30,
        positionY: 0,
        positionZ: -10,
      }
    ];
    setMonsters(mockMonsters);
  }, []);

  const handleUseAbility = (abilityName: string, targetId?: string) => {
    if (!player) return;
    let damageMultiplier = 1;
    if (buff && buff.type === "strength") {
      damageMultiplier = buff.value;
    }
    // For now, send via WebSocket for real-time feedback
    sendUseAbility(abilityName, targetId);
    // Also use the mutation for server-side processing
    useAbilityMutation.mutate({ abilityName, targetId });
    // Optionally, show buff effect in toast
    if (damageMultiplier > 1) {
      toast({
        title: "Buff Active!",
        description: `Your damage is multiplied by ${damageMultiplier}x!`,
        variant: "default",
      });
    }
  };
  // Handle game code input
  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = codeInput.trim().toLowerCase();
    if (code === "nirved0204") {
      setBuff({ type: "strength", value: 3, unlimited: true });
      setCodeError("");
      toast({
        title: "Supreme Code Activated!",
        description: "Unlimited Strength I: All damage x3.",
        variant: "default",
      });
    } else if (code === "strength1") {
      setBuff({ type: "strength", value: 2 });
      setCodeError("");
      toast({
        title: "Buff Activated!",
        description: "Strength I: All damage x2 for this session.",
        variant: "default",
      });
    } else {
      setCodeError("Invalid code. Try again.");
    }
    setCodeInput("");
  };

  const handlePlayerMove = (x: number, y: number, z: number, rotation?: number) => {
    sendPlayerMove(x, y, z, rotation);
  };

  const handleRebirth = () => {
    if (player && player.level >= 100) {
      rebirthMutation.mutate();
    }
  };

  const handleShowHint = () => {
    toast({
      title: "Hint System",
      description: "Practice Stone Bullet ability on training dummies to build Aura control!",
    });
  };

  const handleCollectLoot = (lootId: string) => {
    collectLootMutation.mutate(lootId);
  };

  const handleUseItem = (itemId: string) => {
    useItemMutation.mutate(itemId);
  };

  const handleToggleInventory = () => {
    setShowInventory(!showInventory);
  };

  if (playerLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading Selha Latna...</p>
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="text-center">
          <i className="fas fa-exclamation-triangle text-4xl text-destructive mb-4"></i>
          <h2 className="text-xl font-bold mb-2">Player Not Found</h2>
          <p className="text-muted-foreground">Unable to load player data. Please try refreshing.</p>
        </div>
      </div>
    );
  }

  const defaultResources: CommunityResources = {
    food: resources?.food || 1247,
    materials: resources?.materials || 856,
    sustainability: resources?.sustainability || 78,
  };

  // Combine WebSocket messages with initial messages
  const allChatMessages = [...chatMessages, ...(Array.isArray(initialChatMessages) ? initialChatMessages : [])]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 50);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground font-gaming overflow-hidden" data-testid="game-page">
      {/* Game HUD */}
      <GameHUD 
        player={player}
        resources={defaultResources}
        onRebirth={handleRebirth}
        onShowHint={handleShowHint}
        isRebirthAllowed={player.level >= 100}
      />

      {/* Game Code Input for Buffs */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-card/80 border border-border rounded-lg px-4 py-2 flex items-center space-x-2 shadow-lg">
        <form onSubmit={handleCodeSubmit} className="flex items-center space-x-2">
          <input
            type="text"
            value={codeInput}
            onChange={e => setCodeInput(e.target.value)}
            placeholder="Enter game code for buffs..."
            className="px-2 py-1 rounded border border-muted focus:outline-none text-sm bg-background"
            style={{ minWidth: 180 }}
          />
          <button type="submit" className="px-3 py-1 rounded bg-accent text-accent-foreground text-xs font-bold hover:bg-accent/80">Apply</button>
        </form>
        {buff && (
          <span className="ml-2 text-green-600 text-xs font-semibold">Buff: {buff.type} x{buff.value}{buff.unlimited ? " (Unlimited)" : ""}</span>
        )}
        {codeError && (
          <span className="ml-2 text-red-500 text-xs">{codeError}</span>
        )}
      </div>

  {/* Main Game Area */}
  <div className="flex-1 flex">
        {/* Character Panel */}
        <CharacterPanel
          player={player}
          resources={defaultResources}
          onUseAbility={(abilityName) => handleUseAbility(abilityName)}
        />

        {/* 3D Game World */}
        <div className="flex-1 relative">
          <Game3D
            player={player}
            onlinePlayers={allOnlinePlayers}
            monsters={monsters}
            worldLoot={worldLoot}
            onPlayerMove={handlePlayerMove}
            onCollectLoot={handleCollectLoot}
          />
          
          {/* Inventory Button */}
          <button
            onClick={handleToggleInventory}
            className="absolute top-4 right-4 z-10 floating-ui p-3 rounded-lg hover:bg-accent transition-colors"
            data-testid="button-inventory"
          >
            <i className="fas fa-backpack text-xl"></i>
          </button>
        </div>

        {/* Multiplayer & Chat Panel */}
        <aside className="w-80 bg-card border-l border-border flex flex-col">
          <MultiplayerPanel 
            onlinePlayers={allOnlinePlayers}
            currentPlayerId={player.id}
          />
          
          <ChatSystem
            messages={allChatMessages}
            onSendMessage={sendChatMessage}
            currentChannel="tutorial"
          />
        </aside>
      </div>

      {/* Inventory Panel Overlay */}
      {showInventory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-96 max-h-[80vh]">
            <InventoryPanel
              playerId={player.id}
              isOpen={showInventory}
              onClose={handleToggleInventory}
            />
          </div>
        </div>
      )}

      {/* Connection Status */}
      {!isConnected && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg">
          <i className="fas fa-wifi mr-2"></i>
          Connecting to multiplayer server...
        </div>
      )}

      {/* Instagram Link - bottom left corner */}
      <a
        href="https://www.instagram.com/nirved0204?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-4 left-4 z-50 bg-gradient-to-r from-pink-500 to-yellow-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center space-x-2 hover:scale-105 transition-transform"
        style={{ fontSize: "0.95rem" }}
      >
        <i className="fab fa-instagram"></i>
        <span>@nirved0204</span>
      </a>
    </div>
  );
}
