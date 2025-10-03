import { useState, useEffect, useRef } from "react";
import { ChatMessage } from "@/lib/gameTypes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ChatSystemProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  currentChannel?: string;
}

export function ChatSystem({ messages, onSendMessage, currentChannel = "tutorial" }: ChatSystemProps) {
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date | string) => {
    const messageDate = new Date(date);
    return messageDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex-1 flex flex-col" data-testid="chat-system">
      <div className="p-4 border-b border-border">
        <h3 className="font-fantasy text-lg font-semibold text-primary">
          {currentChannel === "tutorial" ? "Tutorial Zone Chat" : `${currentChannel} Chat`}
        </h3>
      </div>
      
      {/* Chat Messages */}
      <div className="flex-1 p-4 overflow-y-auto scroll-smooth space-y-3" data-testid="chat-messages">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <i className="fas fa-comments text-4xl mb-2"></i>
              <p className="text-sm">No messages yet. Start a conversation!</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="flex items-start space-x-2" data-testid={`message-${message.id}`}>
              <div className="w-6 h-6 bg-gradient-to-br from-primary to-primary/60 rounded-full flex-shrink-0 mt-1">
                <i className="fas fa-user text-primary-foreground text-xs flex items-center justify-center w-full h-full"></i>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-primary truncate">
                    {message.playerName || `Player_${message.playerId?.slice(-6)}`}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(message.createdAt)}
                  </span>
                </div>
                <p className="text-sm mt-1 break-words">{message.message}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Chat Input */}
      <div className="p-4 border-t border-border">
        <div className="flex space-x-2">
          <Input
            type="text"
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
            data-testid="chat-input"
            maxLength={500}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="px-4"
            data-testid="send-message-button"
          >
            <i className="fas fa-paper-plane"></i>
          </Button>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Press Enter to send • {newMessage.length}/500
        </div>
      </div>
    </div>
  );
}
