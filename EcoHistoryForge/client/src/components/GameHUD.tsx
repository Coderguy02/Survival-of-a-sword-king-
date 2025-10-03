import { GamePlayer, CommunityResources } from "@/lib/gameTypes";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface GameHUDProps {
  player: GamePlayer;
  resources: CommunityResources;
  onRebirth: () => void;
  onShowHint: () => void;
  isRebirthAllowed: boolean;
}

export function GameHUD({ player, resources, onRebirth, onShowHint, isRebirthAllowed }: GameHUDProps) {
  const [showHint, setShowHint] = useState(false);

  const handleShowHint = () => {
    setShowHint(true);
    onShowHint();
  };

  const currentHint = {
    title: "Stone Bullet Training",
    description: "Practice your Stone Bullet ability on the training dummies near the central plaza. Focus on accuracy rather than power to build your Aura control.",
    tip: "Hidden stats accumulate even when your level resets. Every practice session counts!"
  };

  return (
    <>
      {/* Top Bar */}
      <header className="bg-card border-b border-border p-4 flex items-center justify-between relative z-50" data-testid="game-header">
        <div className="flex items-center space-x-4">
          <h1 className="font-fantasy text-2xl font-bold text-primary">Latna Saga</h1>
          <span className="text-muted-foreground">Survival Community Builder</span>
        </div>
        
        <div className="flex items-center space-x-6">
          {/* Player Info */}
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <i className="fas fa-user text-primary-foreground text-sm"></i>
            </div>
            <div>
              <div className="text-sm font-medium" data-testid="player-name">{player.characterName}</div>
              <div className="text-xs text-muted-foreground">
                Level <span data-testid="player-level">{player.level}</span> • 
                Rebirth <span data-testid="player-rebirth">{player.rebirthCycle}</span>
              </div>
            </div>
          </div>
          
          {/* Tutorial Lock Status */}
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2" data-testid="tutorial-lock">
            <div className="flex items-center space-x-2">
              <i className="fas fa-lock text-destructive text-sm"></i>
              <span className="text-sm text-destructive">Selha Latna</span>
            </div>
            <div className="text-xs text-muted-foreground">Progress to 100 to unlock</div>
          </div>
          
          {/* System Menu */}
          <Button variant="secondary" size="sm" data-testid="system-menu">
            <i className="fas fa-cog text-foreground"></i>
          </Button>
        </div>
      </header>

      {/* Bottom HUD */}
      <footer className="bg-card border-t border-border p-4" data-testid="bottom-hud">
        <div className="flex items-center justify-between">
          {/* Quick Actions */}
          <div className="flex items-center space-x-2">
            <Button variant="secondary" size="sm" data-testid="button-inventory">
              <i className="fas fa-backpack text-foreground"></i>
            </Button>
            
            <Button variant="secondary" size="sm" data-testid="button-building">
              <i className="fas fa-hammer text-foreground"></i>
            </Button>
            
            <Button variant="secondary" size="sm" data-testid="button-community">
              <i className="fas fa-users text-foreground"></i>
            </Button>
          </div>

          {/* Hint System */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-muted/30 rounded-lg px-3 py-2" data-testid="hint-indicator">
              <i className="fas fa-lightbulb text-yellow-500"></i>
              <span className="text-sm">Hint available</span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleShowHint}
                data-testid="show-hint-button"
                className="text-xs bg-accent hover:bg-accent/80 text-accent-foreground px-2 py-1 h-auto"
              >
                Show
              </Button>
            </div>
          </div>

          {/* Rebirth System */}
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Next Rebirth</div>
              <div className="text-sm font-medium">
                Level <span className="text-destructive">100</span>
              </div>
            </div>
            
            <Button
              variant="destructive"
              onClick={onRebirth}
              disabled={!isRebirthAllowed}
              data-testid="rebirth-button"
              className={!isRebirthAllowed ? "opacity-50 cursor-not-allowed" : ""}
            >
              <i className="fas fa-redo-alt mr-2"></i>
              Rebirth
            </Button>
          </div>
        </div>
      </footer>

      {/* Hint Modal */}
      {showHint && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" data-testid="hint-modal">
          <div className="bg-card border border-border rounded-lg max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-fantasy text-lg font-semibold text-accent">Survival Hint</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHint(false)}
                data-testid="close-hint-button"
              >
                <i className="fas fa-times"></i>
              </Button>
            </div>
            
            <div className="mb-4">
              <div className="bg-muted/20 rounded-lg p-3 mb-3">
                <i className="fas fa-info-circle text-accent mr-2"></i>
                <span className="text-sm font-medium">{currentHint.title}</span>
              </div>
              
              <p className="text-sm text-muted-foreground mb-3">
                {currentHint.description}
              </p>
              
              <div className="bg-accent/10 border border-accent/20 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <i className="fas fa-lightbulb text-accent mt-0.5"></i>
                  <div>
                    <div className="text-sm font-medium text-accent">Pro Tip</div>
                    <div className="text-xs text-muted-foreground">
                      {currentHint.tip}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setShowHint(false)}
                data-testid="hint-got-it-button"
              >
                Got it
              </Button>
              <Button
                variant="default"
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
                data-testid="hint-mark-location-button"
              >
                Mark Location
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
