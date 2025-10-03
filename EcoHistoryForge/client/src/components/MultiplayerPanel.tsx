import { GamePlayer } from "@/lib/gameTypes";

interface MultiplayerPanelProps {
  onlinePlayers: GamePlayer[];
  currentPlayerId?: string;
}

export function MultiplayerPanel({ onlinePlayers, currentPlayerId }: MultiplayerPanelProps) {
  const otherPlayers = onlinePlayers.filter(p => p.id !== currentPlayerId);

  const getPlayerColor = (player: GamePlayer) => {
    // Color based on rebirth cycle
    if (player.rebirthCycle >= 5) return "from-destructive to-destructive/60";
    if (player.rebirthCycle >= 3) return "from-accent to-accent/60";
    if (player.rebirthCycle >= 1) return "from-primary to-primary/60";
    return "from-muted to-muted/60";
  };

  const getPlayerStatus = (player: GamePlayer) => {
    if (player.level >= 90) return "Near Escape";
    if (player.level >= 50) return "Veteran";
    if (player.rebirthCycle > 0) return "Reborn";
    return "Newcomer";
  };

  return (
    <div className="p-4 border-b border-border" data-testid="multiplayer-panel">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-fantasy text-lg font-semibold text-primary">Online Players</h3>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
          <span className="text-sm text-accent" data-testid="online-count">{onlinePlayers.length}</span>
        </div>
      </div>
      
      <div className="space-y-2 max-h-48 overflow-y-auto scroll-smooth" data-testid="online-players-list">
        {otherPlayers.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <i className="fas fa-users text-2xl mb-2"></i>
            <p className="text-sm">You're alone in this zone</p>
            <p className="text-xs">Other players will appear here</p>
          </div>
        ) : (
          otherPlayers.map((player) => (
            <div 
              key={player.id} 
              className="flex items-center space-x-3 p-2 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
              data-testid={`player-${player.id}`}
            >
              <div 
                className={`w-8 h-8 bg-gradient-to-br ${getPlayerColor(player)} rounded-full flex-shrink-0 flex items-center justify-center`}
              >
                <span className="text-xs font-bold text-white">
                  {player.characterName.charAt(0).toUpperCase()}
                </span>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <div className="text-sm font-medium truncate" title={player.characterName}>
                    {player.characterName}
                  </div>
                  {player.rebirthCycle > 0 && (
                    <div className="px-1 py-0.5 bg-accent/20 text-accent rounded text-xs">
                      R{player.rebirthCycle}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    Level {player.level}
                  </span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className={`text-xs ${
                    player.level >= 90 ? 'text-destructive' :
                    player.level >= 50 ? 'text-accent' : 
                    'text-muted-foreground'
                  }`}>
                    {getPlayerStatus(player)}
                  </span>
                </div>
                
                {/* Health bar for nearby players */}
                <div className="w-full bg-muted rounded-full h-1 mt-1">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-green-400 h-1 rounded-full"
                    style={{ width: `${(player.health / player.maxHealth) * 100}%` }}
                  />
                </div>
              </div>
              
              <div className="flex flex-col items-end text-xs text-muted-foreground">
                <div>{Math.floor(Math.sqrt((player.positionX - 0)**2 + (player.positionZ - 0)**2))}m</div>
                <div className="text-accent">
                  {player.isInTutorialZone ? "Tutorial" : "World"}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {otherPlayers.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="text-xs text-muted-foreground text-center">
            Players in Selha Latna tutorial zone
          </div>
        </div>
      )}
    </div>
  );
}
