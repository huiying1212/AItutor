import React, { useState } from "react";
import { Mic, MicOff, Wifi, WifiOff, Send, Save } from "lucide-react";

interface ControlsProps {
  isConnected: boolean;
  isListening: boolean;
  connectionState?: string;
  handleConnectClick: () => void;
  handleMicToggleClick: () => void;
  handleSendText: (text: string) => void;
  handleSaveConversation: () => void;
  hasMessages: boolean;
}

const Controls: React.FC<ControlsProps> = ({
  isConnected,
  isListening,
  connectionState,
  handleConnectClick,
  handleMicToggleClick,
  handleSendText,
  handleSaveConversation,
  hasMessages,
}) => {
  const [textInput, setTextInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSendClick = () => {
    if (textInput.trim() && isConnected && !isSending) {
      setIsSending(true);
      handleSendText(textInput.trim());
      setTextInput("");
      
      // Reset sending state after a short delay to prevent rapid-fire sends
      setTimeout(() => {
        setIsSending(false);
      }, 500);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && textInput.trim()) {
      e.preventDefault();
      handleSendClick();
    }
  };
  const getConnectionIcon = () => {
    if (isConnected) {
      return <Wifi className="h-6 w-6 text-green-500" />;
    }
    return <WifiOff className="h-6 w-6 text-red-500" />;
  };

  const getConnectionTitle = () => {
    if (isConnected) return `Connected (${connectionState}) - Click to disconnect`;
    return "Disconnected - Click to connect";
  };

  const handleSaveClick = async () => {
    if (!hasMessages || isSaving) return;
    setIsSaving(true);
    await handleSaveConversation();
    setTimeout(() => {
      setIsSaving(false);
    }, 1000);
  };

  return (
    <div className="absolute top-4 right-4 flex flex-col items-end z-10 space-y-3">
      <div className="flex items-center space-x-2">
        <div
          className="flex bg-gradient-to-br from-slate-800 to-slate-900 p-3 items-center rounded-full mr-1 cursor-pointer hover:from-slate-700 hover:to-slate-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 ring-2 ring-slate-600/50"
          onClick={handleConnectClick}
          title={getConnectionTitle()}
        >
          {getConnectionIcon()}
        </div>
        <div
          className={`flex bg-gradient-to-br from-slate-800 to-slate-900 p-3 items-center rounded-full transition-all duration-200 shadow-lg ring-2 ring-slate-600/50 ${
            isConnected ? "cursor-pointer hover:from-slate-700 hover:to-slate-800 hover:shadow-xl transform hover:scale-105" : "cursor-not-allowed opacity-50"
          }`}
          onClick={isConnected ? handleMicToggleClick : undefined}
          title={isConnected ? (isListening ? "Click to stop microphone" : "Click to start microphone") : "Connect first to use microphone"}
        >
          {isListening ? (
            <Mic className="h-6 w-6 text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
          ) : (
            <MicOff className="h-6 w-6 text-red-400" />
          )}
        </div>
        <div
          className={`flex bg-gradient-to-br from-slate-800 to-slate-900 p-3 items-center rounded-full transition-all duration-200 shadow-lg ring-2 ring-slate-600/50 ${
            hasMessages && !isSaving ? "cursor-pointer hover:from-slate-700 hover:to-slate-800 hover:shadow-xl transform hover:scale-105" : "cursor-not-allowed opacity-50"
          }`}
          onClick={handleSaveClick}
          title={hasMessages ? (isSaving ? "Saving..." : "Save conversation history") : "No messages to save"}
        >
          <Save className={`h-6 w-6 ${hasMessages ? "text-blue-400" : "text-gray-400"} ${isSaving ? "animate-pulse" : ""}`} />
        </div>
      </div>
      <div className="flex items-center shadow-lg rounded-lg overflow-hidden ring-2 ring-slate-600/50">
        <input
          type="text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          disabled={!isConnected}
          className={`bg-gradient-to-br from-slate-800 to-slate-900 text-white px-4 py-2.5 border-none outline-none transition-all duration-200 placeholder-slate-400 ${
            isConnected ? "focus:from-slate-700 focus:to-slate-800" : "opacity-50 cursor-not-allowed"
          }`}
          style={{ width: "150px" }}
        />
        <button
          onClick={handleSendClick}
          disabled={!isConnected || !textInput.trim() || isSending}
          className={`bg-gradient-to-br from-slate-800 to-slate-900 p-2.5 transition-all duration-200 ${
            isConnected && textInput.trim() && !isSending
              ? "cursor-pointer hover:from-slate-700 hover:to-slate-800 text-green-400" 
              : "cursor-not-allowed opacity-50 text-gray-400"
          }`}
          title={
            !isConnected 
              ? "Connect first to send messages" 
              : isSending 
                ? "Sending..." 
                : "Send message"
          }
        >
          <Send className={`h-5 w-5 ${isSending ? 'animate-pulse' : ''}`} />
        </button>
      </div>
    </div>
  );
};

export default Controls;
