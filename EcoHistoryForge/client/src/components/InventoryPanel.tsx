import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { InventoryItem } from "@/lib/gameTypes";
import { apiRequest } from "@/lib/queryClient";

interface InventoryPanelProps {
  playerId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function InventoryPanel({ playerId, isOpen, onClose }: InventoryPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch player inventory
  const { data: inventory = [], isLoading } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory", playerId],
    enabled: isOpen && !!playerId,
  });

  // Use item mutation
  const useItemMutation = useMutation({
    mutationFn: async (data: { itemId: string; quantity: number }) => {
      return apiRequest("POST", `/api/inventory/use/${playerId}`, data);
    },
    onSuccess: (response: any) => {
      toast({
        title: "Item Used",
        description: response?.message || "Item consumed successfully",
      });
      
      // Refetch inventory and player data
      queryClient.invalidateQueries({ queryKey: ["/api/inventory", playerId] });
      queryClient.invalidateQueries({ queryKey: ["/api/players", playerId] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Use Item",
        description: error.message || "Could not use item",
        variant: "destructive",
      });
    },
  });

  const handleUseItem = (itemId: string, quantity: number = 1) => {
    useItemMutation.mutate({ itemId, quantity });
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-400';
      case 'uncommon': return 'text-green-400';
      case 'rare': return 'text-blue-400';
      case 'epic': return 'text-purple-400';
      case 'legendary': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" data-testid="inventory-modal">
      <div className="bg-card border border-border rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="font-fantasy text-xl font-semibold text-primary">Inventory</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            data-testid="close-inventory-button"
          >
            <i className="fas fa-times"></i>
          </Button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto" data-testid="inventory-content">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : inventory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <i className="fas fa-box-open text-4xl mb-4"></i>
              <p>Your inventory is empty</p>
              <p className="text-sm">Defeat monsters to collect loot</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {inventory.map((inventoryItem) => (
                <div
                  key={inventoryItem.id}
                  className="bg-muted/20 rounded-lg p-4 border border-border hover:bg-muted/30 transition-colors"
                  data-testid={`inventory-item-${inventoryItem.item.id}`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                      <i className={`${inventoryItem.item.icon} text-xl text-primary`}></i>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className={`font-medium ${getRarityColor(inventoryItem.item.rarity)}`}>
                          {inventoryItem.item.name}
                        </h3>
                        <span className="text-sm text-muted-foreground">
                          x{inventoryItem.quantity}
                        </span>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {inventoryItem.item.description}
                      </p>
                      
                      {inventoryItem.item.type === 'consumable' && (
                        <div className="flex items-center space-x-2">
                          <div className="text-xs text-accent">
                            {inventoryItem.item.effects.health && (
                              <span className="mr-2">
                                <i className="fas fa-heart mr-1"></i>
                                +{inventoryItem.item.effects.health}
                              </span>
                            )}
                            {inventoryItem.item.effects.aura && (
                              <span>
                                <i className="fas fa-bolt mr-1"></i>
                                +{inventoryItem.item.effects.aura}
                              </span>
                            )}
                          </div>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUseItem(inventoryItem.item.id, 1)}
                            disabled={useItemMutation.isPending}
                            data-testid={`use-item-${inventoryItem.item.id}`}
                            className="ml-auto"
                          >
                            {useItemMutation.isPending ? (
                              <i className="fas fa-spinner animate-spin"></i>
                            ) : (
                              "Use"
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}