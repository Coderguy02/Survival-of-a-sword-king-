import { useState, useEffect, useCallback, useRef } from "react";
import { ChatMessage, GamePlayer, AbilityResult } from "@/lib/gameTypes";

interface GameSocketData {
  socket: WebSocket | null;
  isConnected: boolean;
  onlinePlayers: GamePlayer[];
  chatMessages: ChatMessage[];
  sendChatMessage: (message: string, channel?: string) => void;
  sendPlayerMove: (x: number, y: number, z: number, rotation?: number) => void;
  sendUseAbility: (abilityName: string, targetId?: string) => void;
  authenticate: (playerId: string) => void;
}

export function useGameSocket(): GameSocketData {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlinePlayers, setOnlinePlayers] = useState<GamePlayer[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);

  const connect = useCallback(() => {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log("Connecting to WebSocket:", wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        reconnectAttempts.current = 0;
        setSocket(ws);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'chat_message':
              setChatMessages(prev => [data.data, ...prev].slice(0, 50));
              break;
              
            case 'player_position':
              setOnlinePlayers(prev => prev.map(player => 
                player.id === data.data.playerId 
                  ? { ...player, ...data.data }
                  : player
              ));
              break;
              
            case 'player_rebirth':
              console.log(`Player ${data.data.playerId} reached rebirth cycle ${data.data.newCycle}`);
              break;
              
            case 'combat_action':
              console.log("Combat action:", data.data);
              break;
              
            case 'ability_result':
              const result: AbilityResult = data.data;
              if (!result.success) {
                console.warn(`Ability failed: ${result.message}`);
              }
              break;
              
            case 'error':
              console.error("WebSocket error:", data.data.message);
              break;
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.onclose = (event) => {
        console.log("WebSocket disconnected:", event.code, event.reason);
        setIsConnected(false);
        setSocket(null);
        
        // Auto-reconnect with exponential backoff
        if (reconnectAttempts.current < 5) {
          const delay = Math.pow(2, reconnectAttempts.current) * 1000;
          console.log(`Attempting to reconnect in ${delay}ms...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
    }
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socket) {
        socket.close();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = useCallback((type: string, data: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type, data }));
    } else {
      console.warn("WebSocket not connected, cannot send message");
    }
  }, [socket]);

  const sendChatMessage = useCallback((message: string, channel: string = "tutorial") => {
    sendMessage('chat_message', { message, channel });
  }, [sendMessage]);

  const sendPlayerMove = useCallback((x: number, y: number, z: number, rotation?: number) => {
    sendMessage('player_move', { x, y, z, rotation });
  }, [sendMessage]);

  const sendUseAbility = useCallback((abilityName: string, targetId?: string) => {
    sendMessage('use_ability', { abilityName, targetId });
  }, [sendMessage]);

  const authenticate = useCallback((playerId: string) => {
    sendMessage('authenticate', { playerId });
  }, [sendMessage]);

  return {
    socket,
    isConnected,
    onlinePlayers,
    chatMessages,
    sendChatMessage,
    sendPlayerMove,
    sendUseAbility,
    authenticate,
  };
}
