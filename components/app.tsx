"use client";

import Controls from "@/components/controls";
import Whiteboard from "@/components/whiteboard";
import Logs from "@/components/logs";
import { useEffect, useRef, useState, useCallback } from "react";
import { INSTRUCTIONS, TOOLS } from "@/lib/config";
import { BASE_URL, MODEL } from "@/lib/constants";

type ToolCallOutput = {
  response: string;
  [key: string]: any;
};

export default function App() {
  const [logs, setLogs] = useState<any[]>([]);
  const [toolCall, setToolCall] = useState<any>(null);
  const [isSessionStarted, setIsSessionStarted] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const audioElement = useRef<HTMLAudioElement | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const audioTransceiver = useRef<RTCRtpTransceiver | null>(null);
  const tracks = useRef<RTCRtpSender[] | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const maxReconnectAttempts = 3;

  // Auto-reconnect function
  const autoReconnect = useCallback(async () => {
    if (reconnectAttempts >= maxReconnectAttempts) {
      console.log("Max reconnection attempts reached");
      setIsReconnecting(false);
      return;
    }

    setIsReconnecting(true);
    setReconnectAttempts(prev => prev + 1);
    
    console.log(`Attempting to reconnect... (${reconnectAttempts + 1}/${maxReconnectAttempts})`);
    
    // Wait a bit before reconnecting
    await new Promise(resolve => setTimeout(resolve, 2000 + reconnectAttempts * 1000));
    
    // Clean up current connection
    if (peerConnection.current) {
      peerConnection.current.close();
    }
    if (dataChannel) {
      dataChannel.close();
    }
    
    // Reset states
    setIsSessionStarted(false);
    setIsSessionActive(false);
    setDataChannel(null);
    peerConnection.current = null;
    
    // Try to start a new session
    try {
      await startSession();
      setReconnectAttempts(0);
      setIsReconnecting(false);
    } catch (error) {
      console.error("Reconnection failed:", error);
      // Try again
      reconnectTimeout.current = setTimeout(autoReconnect, 3000);
    }
  }, [reconnectAttempts, dataChannel]);

  // Start a new realtime session
  async function startSession() {
    try {
      if (!isSessionStarted) {
        setIsSessionStarted(true);
        setConnectionState('connecting');
        
        // Get an ephemeral session token
        const sessionResponse = await fetch("/api/session");
        if (!sessionResponse.ok) {
          throw new Error(`Session API failed: ${sessionResponse.status}`);
        }
        
        const session = await sessionResponse.json();
        if (!session.client_secret?.value) {
          throw new Error("Invalid session response");
        }
        
        const sessionToken = session.client_secret.value;
        const sessionId = session.id;

        console.log("Session id:", sessionId);

        // Create a peer connection with improved configuration
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        });

        // Monitor connection state changes
        pc.onconnectionstatechange = () => {
          const state = pc.connectionState;
          console.log('Connection state changed:', state);
          setConnectionState(state);
          
          if (state === 'connected') {
            setReconnectAttempts(0);
            setIsReconnecting(false);
            if (reconnectTimeout.current) {
              clearTimeout(reconnectTimeout.current);
              reconnectTimeout.current = null;
            }
          } else if (state === 'disconnected' || state === 'failed') {
            console.log('Connection lost, attempting to reconnect...');
            if (!isReconnecting) {
              autoReconnect();
            }
          }
        };

        // Monitor ICE connection state
        pc.oniceconnectionstatechange = () => {
          console.log('ICE connection state:', pc.iceConnectionState);
        };

        // Set up to play remote audio from the model
        if (!audioElement.current) {
          audioElement.current = document.createElement("audio");
        }
        audioElement.current.autoplay = true;
        pc.ontrack = (e) => {
          console.log('Received remote audio track');
          if (audioElement.current) {
            audioElement.current.srcObject = e.streams[0];
          }
        };

        // Get user media with error handling
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
        } catch (mediaError) {
          console.error("Failed to get user media:", mediaError);
          throw new Error("Microphone access failed. Please check permissions.");
        }

        stream.getTracks().forEach((track) => {
          const sender = pc.addTrack(track, stream);
          if (sender) {
            tracks.current = [...(tracks.current || []), sender];
          }
        });

        // Set up data channel for sending and receiving events
        const dc = pc.createDataChannel("oai-events");
        setDataChannel(dc);

        // Start the session using the Session Description Protocol (SDP)
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const sdpResponse = await fetch(`${BASE_URL}?model=${MODEL}`, {
          method: "POST",
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            "Content-Type": "application/sdp",
          },
        });

        if (!sdpResponse.ok) {
          throw new Error(`SDP exchange failed: ${sdpResponse.status}`);
        }

        const answer: RTCSessionDescriptionInit = {
          type: "answer",
          sdp: await sdpResponse.text(),
        };
        await pc.setRemoteDescription(answer);

        peerConnection.current = pc;
        console.log("Session started successfully");
      }
    } catch (error) {
      console.error("Error starting session:", error);
      setIsSessionStarted(false);
      setConnectionState('failed');
      throw error;
    }
  }

  // Stop current session, clean up peer connection and data channel
  function stopSession() {
    // Clear any pending reconnection attempts
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    
    if (dataChannel) {
      dataChannel.close();
    }
    if (peerConnection.current) {
      peerConnection.current.close();
    }

    setIsSessionStarted(false);
    setIsSessionActive(false);
    setDataChannel(null);
    peerConnection.current = null;
    if (audioStream) {
      audioStream.getTracks().forEach((track) => track.stop());
    }
    setAudioStream(null);
    setIsListening(false);
    audioTransceiver.current = null;
    setConnectionState('closed');
    setReconnectAttempts(0);
    setIsReconnecting(false);
  }

  // Grabs a new mic track and replaces the placeholder track in the transceiver
  async function startRecording() {
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      setAudioStream(newStream);

      // If we already have an audioSender, just replace its track:
      if (tracks.current) {
        const micTrack = newStream.getAudioTracks()[0];
        tracks.current.forEach((sender) => {
          sender.replaceTrack(micTrack);
        });
      } else if (peerConnection.current) {
        // Fallback if audioSender somehow didn't get set
        newStream.getTracks().forEach((track) => {
          const sender = peerConnection.current?.addTrack(track, newStream);
          if (sender) {
            tracks.current = [...(tracks.current || []), sender];
          }
        });
      }

      setIsListening(true);
      console.log("Microphone started.");
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  }

  // Replaces the mic track with a placeholder track
  function stopRecording() {
    setIsListening(false);

    // Stop existing mic tracks so the user's mic is off
    if (audioStream) {
      audioStream.getTracks().forEach((track) => track.stop());
    }
    setAudioStream(null);

    // Replace with a placeholder (silent) track
    if (tracks.current) {
      const placeholderTrack = createEmptyAudioTrack();
      tracks.current.forEach((sender) => {
        sender.replaceTrack(placeholderTrack);
      });
    }
  }

  // Creates a placeholder track that is silent
  function createEmptyAudioTrack(): MediaStreamTrack {
    const audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();
    return destination.stream.getAudioTracks()[0];
  }

  // Send a message to the model
  const sendClientEvent = useCallback(
    (message: any) => {
      if (dataChannel) {
        message.event_id = message.event_id || crypto.randomUUID();
        dataChannel.send(JSON.stringify(message));
      } else {
        console.error(
          "Failed to send message - no data channel available",
          message
        );
      }
    },
    [dataChannel]
  );

  // Attach event listeners to the data channel when a new one is created
  useEffect(() => {
    async function handleToolCall(output: any) {
      const toolCall = {
        name: output.name,
        arguments: output.arguments,
      };

      console.log("Handling tool call:", toolCall);

      // Handle different tool types
      if (toolCall.name === "search_knowledge") {
        try {
          // Parse arguments - handle both string and object cases
          let args: any = {};
          if (typeof toolCall.arguments === 'string') {
            if (toolCall.arguments.trim() === '') {
              throw new Error("Empty arguments string");
            }
            args = JSON.parse(toolCall.arguments);
          } else if (typeof toolCall.arguments === 'object' && toolCall.arguments !== null) {
            args = toolCall.arguments;
          } else {
            throw new Error(`Invalid arguments type: ${typeof toolCall.arguments}`);
          }
          const response = await fetch('/api/knowledge/search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: args.query,
              top_k: args.top_k || 3
            }),
          });

          const result = await response.json();
          console.log("Knowledge search result:", result);

          // Send the search result back to the realtime API
          if (dataChannel && dataChannel.readyState === 'open') {
            const toolResponse = {
              type: "conversation.item.create",
              item: {
                type: "function_call_output",
                call_id: output.call_id,
                output: JSON.stringify({
                  success: result.success,
                  message: result.message || "Knowledge retrieved successfully",
                  knowledge_found: result.knowledge.text_chunks > 0,
                  context_text: result.knowledge.context_text,
                  sources: result.knowledge.sources,
                  text_chunks: result.knowledge.text_chunks || 0,
                  related_images: result.knowledge.related_images || 0,
                  images: result.knowledge.images || []
                })
              }
            };
            dataChannel.send(JSON.stringify(toolResponse));

            // Generate response based on the tool output
            const responseCreate = {
              type: "response.create"
            };
            dataChannel.send(JSON.stringify(responseCreate));
          }
        } catch (error) {
          console.error("Error in knowledge search:", error);
          console.error("Tool call arguments:", toolCall.arguments);
          
          // Send error response back to realtime API
          if (dataChannel && dataChannel.readyState === 'open') {
            const errorResponse = {
              type: "conversation.item.create",
              item: {
                type: "function_call_output", 
                call_id: output.call_id,
                output: JSON.stringify({
                  success: false,
                  knowledge: { context_text: "", related_images: 0, sources: [] },
                  message: "Knowledge search failed, proceeding without enhancement"
                })
              }
            };
            dataChannel.send(JSON.stringify(errorResponse));

            const responseCreate = {
              type: "response.create"
            };
            dataChannel.send(JSON.stringify(responseCreate));
          }
        }
      } else {
        // Handle other tool calls (display_content, clear_whiteboard, highlight_text, display_images)
        setToolCall(toolCall);

        // TOOL CALL HANDLING for whiteboard tools
        // Initialize toolCallOutput with a default response
        const toolCallOutput: ToolCallOutput = {
          response: `Tool call ${toolCall.name} executed successfully.`,
        };

        try {
          // Send tool call output
          if (dataChannel && dataChannel.readyState === 'open') {
            const toolResponse = {
              type: "conversation.item.create",
              item: {
                type: "function_call_output",
                call_id: output.call_id,
                output: JSON.stringify(toolCallOutput),
              },
            };
            dataChannel.send(JSON.stringify(toolResponse));

            // Wait a moment before triggering response
            setTimeout(() => {
              // CRITICAL FIX: Trigger response generation after tool call
              // This ensures the LLM continues speaking after displaying content
              const responseCreate = {
                type: "response.create",
              };
              dataChannel.send(JSON.stringify(responseCreate));
              console.log("Response generation triggered after tool call");
            }, 100);
          }
        } catch (error) {
          console.error("Error handling tool call:", error);
        }
      }
    }

    if (dataChannel) {
      // Append new server events to the list
      dataChannel.addEventListener("message", (e) => {
        const event = JSON.parse(e.data);
        if (event.type === "response.done") {
          const output = event.response.output[0];
          setLogs((prev) => [output, ...prev]);
          if (output?.type === "function_call") {
            handleToolCall(output);
          }
        }
      });

      // Handle data channel errors
      dataChannel.addEventListener("error", (error) => {
        console.error("Data channel error:", error);
      });

      dataChannel.addEventListener("close", () => {
        console.log("Data channel closed");
        setIsSessionActive(false);
      });

      // Set session active when the data channel is opened
      dataChannel.addEventListener("open", () => {
        console.log("Data channel opened successfully");
        setIsSessionActive(true);
        setIsListening(true);
        setLogs([]);
        
        // Send session config with better error handling
        try {
          const sessionUpdate = {
            type: "session.update",
            session: {
              tools: TOOLS,
              instructions: INSTRUCTIONS,
              voice: "coral",
              turn_detection: {
                type: "server_vad",
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 200
              },
              input_audio_format: "pcm16",
              output_audio_format: "pcm16",
              input_audio_transcription: {
                model: "whisper-1"
              }
            },
          };
          sendClientEvent(sessionUpdate);
          console.log("Session update sent:", sessionUpdate);
        } catch (error) {
          console.error("Failed to send session update:", error);
        }
      });
    }
  }, [dataChannel, sendClientEvent]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      stopSession();
    };
  }, []);

  const handleConnectClick = async () => {
    if (isSessionActive) {
      console.log("Stopping session.");
      stopSession();
    } else {
      console.log("Starting session.");
      startSession();
    }
  };

  const handleMicToggleClick = async () => {
    if (isListening) {
      console.log("Stopping microphone.");
      stopRecording();
    } else {
      console.log("Starting microphone.");
      startRecording();
    }
  };

  // Send a text message to the model
  const handleSendText = useCallback((text: string) => {
    if (!isSessionActive || !dataChannel) {
      console.error("Cannot send text: session not active or no data channel");
      return;
    }

    // Cancel any ongoing response to interrupt the AI
    sendClientEvent({
      type: "response.cancel"
    });

    // Send text message as conversation item
    sendClientEvent({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: text
          }
        ]
      }
    });

    // Trigger response generation
    sendClientEvent({
      type: "response.create"
    });

    console.log("Text message sent:", text);
  }, [isSessionActive, dataChannel, sendClientEvent]);

  return (
    <div className="relative size-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="h-full">
        <Whiteboard toolCall={toolCall} />
      </div>
      <Controls
        handleConnectClick={handleConnectClick}
        handleMicToggleClick={handleMicToggleClick}
        handleSendText={handleSendText}
        isConnected={isSessionActive}
        isListening={isListening}
        connectionState={connectionState}
        isReconnecting={isReconnecting}
      />
      <Logs messages={logs} />
    </div>
  );
}
