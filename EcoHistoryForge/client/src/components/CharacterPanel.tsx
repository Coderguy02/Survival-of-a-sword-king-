import { GamePlayer, CommunityResources } from "@/lib/gameTypes";

interface CharacterPanelProps {
  player: GamePlayer;
  resources: CommunityResources;
  onUseAbility: (abilityName: string) => void;
}

export function CharacterPanel({ player, resources, onUseAbility }: CharacterPanelProps) {
  const abilities = [
    {
      id: "stone_bullet",
      name: "Stone Bullet",
      icon: "fas fa-meteor",
      cost: 50,
      requiredLevel: 1,
      description: "Flicks pebbles with lethal force"
    },
    {
      id: "wind_manipulation",
      name: "Wind Manipulation", 
      icon: "fas fa-wind",
      cost: 75,
      requiredLevel: 15,
      description: "Creates powerful pressure waves"
    },
    {
      id: "ground_dig_up",
      name: "Ground Dig-Up",
      icon: "fas fa-shield-alt", 
      cost: 100,
      requiredLevel: 60,
      description: "Raises earth as shields"
    },
    {
      id: "aura_release",
      name: "Aura Release",
      icon: "fas fa-fist-raised",
      cost: 200,
      requiredLevel: 85,
      description: "Massive stored aura release"
    }
  ];

  const getHealthPercentage = () => Math.floor((player.health / player.maxHealth) * 100);
  const getAuraPercentage = () => Math.floor((player.aura / player.maxAura) * 100);
  const getExpPercentage = () => Math.floor((player.experience % 100) * 100 / 100);

  return (
    <aside className="w-80 bg-card border-r border-border p-4 overflow-y-auto scroll-smooth" data-testid="character-panel">
      {/* Character Vitals */}
      <div className="mb-6">
        <h3 className="font-fantasy text-lg font-semibold mb-3 text-primary">Character Status</h3>
        
        {/* Health Bar */}
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span>Health</span>
            <span data-testid="health-value">{player.health.toLocaleString()}/{player.maxHealth.toLocaleString()}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-3">
            <div 
              className="health-bar h-3 rounded-full" 
              style={{ width: `${getHealthPercentage()}%` }}
              data-testid="health-bar"
            />
          </div>
        </div>
        
        {/* Aura Bar */}
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span>Aura</span>
            <span data-testid="aura-value">{player.aura.toLocaleString()}/{player.maxAura.toLocaleString()}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-primary to-primary/80 h-3 rounded-full aura-glow" 
              style={{ width: `${getAuraPercentage()}%` }}
              data-testid="aura-bar"
            />
          </div>
        </div>
        
        {/* Experience Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Experience</span>
            <span data-testid="exp-value">{player.experience.toLocaleString()}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-3">
            <div 
              className="exp-bar h-3 rounded-full" 
              style={{ width: `${getExpPercentage()}%` }}
              data-testid="exp-bar"
            />
          </div>
        </div>
      </div>

      {/* Hidden Stats Accumulation */}
      <div className="mb-6 bg-muted/30 rounded-lg p-3" data-testid="hidden-stats">
        <h4 className="font-medium text-accent mb-2 flex items-center">
          <i className="fas fa-eye-slash mr-2"></i>
          Hidden Accumulation
        </h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">STR:</span>
            <span className="text-accent ml-1" data-testid="hidden-strength">+{player.hiddenStrength.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-muted-foreground">AGI:</span>
            <span className="text-accent ml-1" data-testid="hidden-agility">+{player.hiddenAgility.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-muted-foreground">INT:</span>
            <span className="text-accent ml-1" data-testid="hidden-intelligence">+{player.hiddenIntelligence.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-muted-foreground">END:</span>
            <span className="text-accent ml-1" data-testid="hidden-endurance">+{player.hiddenEndurance.toLocaleString()}</span>
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          Resets preserve these bonuses
        </div>
      </div>

      {/* Aura Abilities */}
      <div className="mb-6">
        <h3 className="font-fantasy text-lg font-semibold mb-3 text-primary">Aura Abilities</h3>
        
        <div className="grid grid-cols-2 gap-2">
          {abilities.map(ability => {
            const isUnlocked = player.level >= ability.requiredLevel;
            const hasEnoughAura = player.aura >= ability.cost;
            const canUse = isUnlocked && hasEnoughAura;
            
            return (
              <button
                key={ability.id}
                className={`p-3 rounded-lg transition-all ${
                  canUse 
                    ? 'bg-secondary hover:bg-secondary/80 combat-ready' 
                    : 'bg-secondary/50 opacity-50 cursor-not-allowed'
                }`}
                onClick={() => canUse && onUseAbility(ability.id)}
                disabled={!canUse}
                data-testid={`ability-${ability.id}`}
                title={ability.description}
              >
                <div className="text-center">
                  <i className={`${ability.icon} text-2xl ${canUse ? 'text-primary' : 'text-muted-foreground'} mb-2`}></i>
                  <div className="text-sm font-medium">{ability.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {isUnlocked ? `Cost: ${ability.cost} Aura` : `Level ${ability.requiredLevel}`}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Resource Management */}
      <div className="mb-6">
        <h3 className="font-fantasy text-lg font-semibold mb-3 text-accent">Community Resources</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-muted/20 rounded p-2" data-testid="resource-food">
            <div className="flex items-center space-x-2">
              <i className="fas fa-seedling text-accent"></i>
              <span className="text-sm">Food Production</span>
            </div>
            <span className="text-sm font-medium">{resources.food.toLocaleString()}</span>
          </div>
          
          <div className="flex items-center justify-between bg-muted/20 rounded p-2" data-testid="resource-materials">
            <div className="flex items-center space-x-2">
              <i className="fas fa-hammer text-primary"></i>
              <span className="text-sm">Building Materials</span>
            </div>
            <span className="text-sm font-medium">{resources.materials.toLocaleString()}</span>
          </div>
          
          <div className="flex items-center justify-between bg-muted/20 rounded p-2" data-testid="resource-sustainability">
            <div className="flex items-center space-x-2">
              <i className="fas fa-leaf text-accent"></i>
              <span className="text-sm">Sustainability</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-12 bg-muted rounded-full h-2">
                <div 
                  className="bg-accent h-2 rounded-full" 
                  style={{ width: `${resources.sustainability}%` }}
                />
              </div>
              <span className="text-xs text-accent">{resources.sustainability}%</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
