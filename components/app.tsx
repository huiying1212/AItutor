"use client";

import Controls from "@/components/controls";
import Whiteboard from "@/components/whiteboard";
import Logs from "@/components/logs";
import { useEffect, useRef, useState, useCallback } from "react";
import { INSTRUCTIONS, TOOLS } from "@/lib/config";
import { BASE_URL, MODEL, ACTIVE_PROVIDER, getCurrentConfig } from "@/lib/constants";

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

  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const audioElement = useRef<HTMLAudioElement | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const audioTransceiver = useRef<RTCRtpTransceiver | null>(null);
  const tracks = useRef<RTCRtpSender[] | null>(null);
  
  // WebSocket for Aliyun
  const webSocket = useRef<WebSocket | null>(null);
  const audioContext = useRef<AudioContext | null>(null); // For output (24kHz)
  const inputAudioContext = useRef<AudioContext | null>(null); // For input (16kHz)
  const audioWorklet = useRef<AudioWorkletNode | null>(null);
  
  // Audio playback queue
  const audioQueue = useRef<string[]>([]);
  const isPlayingAudio = useRef<boolean>(false);
  const nextPlayTime = useRef<number>(0);


  // Start Aliyun WebSocket session
  async function startAliyunWebSocketSession() {
    try {
      // Get API key from session endpoint
      const sessionResponse = await fetch("/api/session");
      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json();
        throw new Error(`Session API failed: ${sessionResponse.status} - ${errorData.error || 'Unknown error'}`);
      }
      
      const session = await sessionResponse.json();
      if (!session.api_key) {
        throw new Error("Invalid Aliyun session response: missing api_key");
      }
      
      const config = getCurrentConfig();
      const apiKey = session.api_key;
      const workspace = session.workspace || "";
      
      // Construct WebSocket URL
      // Browser WebSocket doesn't support custom headers during handshake
      // Aliyun requires Authorization header, so we use a local proxy server
      // The proxy server (websocket-proxy.js) adds the Authorization header
      
      // Check if we're using the proxy (development) or direct connection (if supported)
      const useProxy = process.env.NEXT_PUBLIC_USE_WS_PROXY !== 'false';
      const proxyUrl = process.env.NEXT_PUBLIC_WS_PROXY_URL || 'ws://localhost:8080';
      
      let wsUrl: string;
      if (useProxy) {
        // Use local proxy server
        wsUrl = `${proxyUrl}?model=${MODEL}&apiKey=${encodeURIComponent(apiKey)}${workspace ? `&workspace=${encodeURIComponent(workspace)}` : ''}`;
        console.log("Connecting to Aliyun via proxy:", wsUrl.replace(apiKey, '***'));
      } else {
        // Try direct connection (may not work due to browser limitations)
        wsUrl = `${BASE_URL}?model=${MODEL}`;
        console.log("Attempting direct connection to Aliyun:", wsUrl);
        console.warn("Note: Direct connection may fail due to browser WebSocket header limitations");
      }
      
      const ws = new WebSocket(wsUrl);
      webSocket.current = ws;
      
      // Set up WebSocket event handlers
      ws.onopen = () => {
        console.log("Aliyun WebSocket connected");
        setConnectionState('connected');
        setIsSessionActive(true);
        setIsListening(true);
        
        // Send session configuration (OpenAI-compatible format for Aliyun)
        const sessionUpdate = {
          type: "session.update",
          session: {
            modalities: ["text", "audio"],
            instructions: INSTRUCTIONS,
            voice: config.voice,
            tools: TOOLS,
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500
            }
          }
        };
        
        ws.send(JSON.stringify(sessionUpdate));
        console.log("Session configuration sent (Aliyun format)");
      };
      
      ws.onmessage = async (event) => {
        try {
          // Check if data is a Blob (binary data)
          if (event.data instanceof Blob) {
            console.log("Received binary data (Blob):", event.data.size, "bytes");
            // Convert Blob to text if it's actually JSON
            const text = await event.data.text();
            try {
              const data = JSON.parse(text);
              handleAliyunMessage(data);
            } catch (e) {
              // It's actual binary data (e.g., audio), handle accordingly
              console.log("Received non-JSON binary data, skipping");
              return;
            }
          } else if (typeof event.data === 'string') {
            // It's a string, parse as JSON
            const data = JSON.parse(event.data);
            handleAliyunMessage(data);
          } else {
            console.warn("Received unknown data type:", typeof event.data);
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
          console.error("Raw data:", event.data);
        }
      };
      
      // Helper function to handle parsed messages
      function handleAliyunMessage(message: any) {
        // Aliyun uses "event" field instead of "type", and data is nested under "data"
        const eventType = message.event || message.type;
        const eventData = message.data || message;
        
        console.log("Received event:", eventType);
        
        // Log full message for debugging (only in development)
        if (process.env.NODE_ENV === 'development') {
          console.log("Full message data:", message);
        }
        
        // Handle different event types
        if (eventType === "response.created") {
          // New response starting - clear audio queue to prevent old audio playing
          console.log("New response starting, clearing audio queue");
          audioQueue.current = [];
          nextPlayTime.current = 0;
        } else if (eventType === "response.done") {
          console.log("📋 Response done - full response:", eventData.response);
          const output = eventData.response?.output?.[0] || eventData.output?.[0];
          if (output) {
            console.log("📋 Response output item:", output);
            setLogs((prev) => [output, ...prev]);
            if (output?.type === "function_call") {
              handleToolCallFromWebSocket(output);
            }
          }
        } else if (eventType === "response.audio.delta") {
          // Handle audio chunks
          const audioData = eventData.delta || eventData.audio;
          if (audioData && audioContext.current) {
            playAudioChunk(audioData);
          }
        } else if (eventType === "response.audio_transcript.delta") {
          // Handle audio transcript (this is what the AI is saying)
          const delta = eventData.delta || eventData.transcript_delta;
          console.log("🗣️ AI transcript:", delta);
          
          // Log full transcript for debugging
          if (eventData.transcript) {
            console.log("📝 Full transcript so far:", eventData.transcript);
          }
        } else if (eventType === "response.audio_transcript.done") {
          // Log final transcript
          console.log("✅ AI finished saying:", eventData.transcript);
        } else if (eventType === "error") {
          // Handle error messages from Aliyun
          console.warn("⚠️ Aliyun API error event received");
          console.warn("Full error data:", JSON.stringify(message, null, 2));
          
          const errorDetails = eventData.error || eventData.message || eventData;
          const errorMessage = errorDetails.message || errorDetails.type || "No error details provided";
          const errorCode = errorDetails.code || errorDetails.error_code || "unknown";
          
          console.warn("Error details:", errorDetails);
          console.warn("Error message:", errorMessage);
          console.warn("Error code:", errorCode);
          
          // Only use console.error for critical errors that should stop the connection
          const criticalErrors = ['invalid_api_key', 'authentication_failed', 'unauthorized'];
          if (criticalErrors.includes(errorCode)) {
            console.error("❌ Critical error - connection may fail:", errorMessage);
            // Optionally close the connection for critical errors
            // ws.close();
          } else {
            console.warn("⚠️ Non-critical error - continuing:", errorMessage);
          }
        } else if (eventType === "session.updated" || eventType === "session.created") {
          console.log(`Session ${eventType === "session.created" ? "created" : "updated"} successfully`);
          // Now it's safe to set up the microphone
          setupAliyunMicrophone().catch(err => {
            console.error("Failed to set up microphone:", err);
            console.warn("Continuing without microphone - you can still use text input");
          });
        } else {
          // Log other event types for debugging
          console.log("Other event type:", eventType);
        }
      }
      
      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setConnectionState('failed');
      };
      
      ws.onclose = () => {
        console.log("WebSocket closed");
        setIsSessionActive(false);
        setConnectionState('closed');
      };
      
      // Set up audio context for playback (24kHz for Aliyun output)
      if (!audioContext.current) {
        audioContext.current = new AudioContext({ sampleRate: 24000 });
      }
      
      // Don't set up microphone immediately - wait for session.created/updated
      // This avoids permission errors and timing issues
      console.log("Waiting for session confirmation before setting up microphone...");
      
    } catch (error) {
      console.error("Error starting Aliyun WebSocket session:", error);
      setIsSessionStarted(false);
      setConnectionState('failed');
      throw error;
    }
  }
  
  // Set up microphone for Aliyun WebSocket
  async function setupAliyunMicrophone() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1
        }
      });
      
      setAudioStream(stream);
      
      // Create audio context for input processing (16kHz)
      if (!inputAudioContext.current) {
        inputAudioContext.current = new AudioContext({ sampleRate: 16000 });
      }
      
      const source = inputAudioContext.current.createMediaStreamSource(stream);
      const processor = inputAudioContext.current.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (e) => {
        if (webSocket.current && webSocket.current.readyState === WebSocket.OPEN && isListening) {
          const inputData = e.inputBuffer.getChannelData(0);
          // Convert float32 to int16 PCM
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          
          // Send audio data to Aliyun (Aliyun format)
          const audioEvent = {
            type: "input_audio_buffer.append",
            audio: btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)))
          };
          webSocket.current.send(JSON.stringify(audioEvent));
        }
      };
      
      source.connect(processor);
      processor.connect(inputAudioContext.current.destination);
      
      console.log("Aliyun microphone setup complete");
    } catch (error) {
      console.error("Error setting up Aliyun microphone:", error);
      throw error;
    }
  }
  
  // Play audio chunk from Aliyun (with queue to prevent overlapping)
  function playAudioChunk(base64Audio: string) {
    try {
      if (!audioContext.current) return;
      
      // Add to queue
      audioQueue.current.push(base64Audio);
      
      // Start playing if not already playing
      if (!isPlayingAudio.current) {
        processAudioQueue();
      }
    } catch (error) {
      console.error("Error queueing audio chunk:", error);
    }
  }
  
  // Process audio queue sequentially
  function processAudioQueue() {
    if (audioQueue.current.length === 0) {
      isPlayingAudio.current = false;
      return;
    }
    
    isPlayingAudio.current = true;
    const base64Audio = audioQueue.current.shift();
    
    if (!base64Audio || !audioContext.current) {
      processAudioQueue();
      return;
    }
    
    try {
      // Decode base64 to PCM16
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      
      // Convert int16 to float32
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7FFF);
      }
      
      // Create audio buffer
      const audioBuffer = audioContext.current.createBuffer(
        1, 
        float32.length, 
        audioContext.current.sampleRate
      );
      audioBuffer.getChannelData(0).set(float32);
      
      // Schedule playback
      const source = audioContext.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.current.destination);
      
      // Calculate when to start (to ensure seamless playback)
      const currentTime = audioContext.current.currentTime;
      const startTime = Math.max(currentTime, nextPlayTime.current);
      
      source.start(startTime);
      
      // Update next play time
      nextPlayTime.current = startTime + audioBuffer.duration;
      
      // When this chunk finishes, play the next one
      source.onended = () => {
        processAudioQueue();
      };
      
    } catch (error) {
      console.error("Error playing audio chunk:", error);
      // Continue with next chunk even if this one fails
      processAudioQueue();
    }
  }
  
  // Handle tool calls from WebSocket
  async function handleToolCallFromWebSocket(output: any) {
    // Reuse the existing tool call handling logic
    const toolCall = {
      name: output.name,
      arguments: output.arguments,
    };
    
    console.log("Handling tool call from WebSocket:", toolCall);
    
    if (toolCall.name === "search_knowledge") {
      try {
        let args: any = {};
        if (typeof toolCall.arguments === 'string') {
          args = JSON.parse(toolCall.arguments);
        } else {
          args = toolCall.arguments;
        }
        
        const response = await fetch('/api/knowledge/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: args.query,
            top_k: args.top_k || 3
          }),
        });
        
        const result = await response.json();
        
        // Note: Aliyun may not support conversation.item.create for tool responses
        // The tool call result is displayed in the UI, but we don't send it back to the API
        // as Aliyun's protocol may differ from OpenAI's
        console.log("Knowledge search completed:", {
          success: result.success,
          text_chunks: result.knowledge.text_chunks || 0,
          related_images: result.knowledge.related_images || 0
        });
      } catch (error) {
        console.error("Error in knowledge search:", error);
      }
    } else {
      setToolCall(toolCall);
      
      // Note: Aliyun may not support conversation.item.create for tool responses
      // The tool call is displayed in the UI
      console.log(`Tool call ${toolCall.name} executed successfully`);
    }
  }

  // Start a new realtime session
  async function startSession() {
    try {
      if (!isSessionStarted) {
        setIsSessionStarted(true);
        setConnectionState('connecting');
        
        const config = getCurrentConfig();
        console.log(`Starting ${ACTIVE_PROVIDER.toUpperCase()} session with model: ${config.model}`);
        
        if (ACTIVE_PROVIDER === "aliyun") {
          // Aliyun uses WebSocket, not WebRTC
          await startAliyunWebSocketSession();
          return;
        }
        
        // OpenAI uses WebRTC with SDP exchange
        // Get an ephemeral session token
        const sessionResponse = await fetch("/api/session");
        if (!sessionResponse.ok) {
          const errorData = await sessionResponse.json();
          throw new Error(`Session API failed: ${sessionResponse.status} - ${errorData.error || 'Unknown error'}`);
        }
        
        const session = await sessionResponse.json();
        
        // Handle OpenAI session response
        let sessionToken: string;
        let sessionId: string;
        
        if (!session.client_secret?.value) {
          throw new Error("Invalid OpenAI session response");
        }
        sessionToken = session.client_secret.value;
        sessionId = session.id;

        console.log(`${ACTIVE_PROVIDER.toUpperCase()} Session id:`, sessionId);

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

        // Prepare headers for OpenAI WebRTC
        const headers: Record<string, string> = {
          "Content-Type": "application/sdp",
          "Authorization": `Bearer ${sessionToken}`,
        };

        const sdpResponse = await fetch(`${BASE_URL}?model=${MODEL}`, {
          method: "POST",
          body: offer.sdp,
          headers,
        });

        if (!sdpResponse.ok) {
          const errorText = await sdpResponse.text();
          console.error(`SDP exchange failed for ${ACTIVE_PROVIDER}:`, sdpResponse.status, errorText);
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
    
    // Clean up WebRTC resources (OpenAI)
    if (dataChannel) {
      dataChannel.close();
    }
    if (peerConnection.current) {
      peerConnection.current.close();
    }
    
    // Clean up WebSocket resources (Aliyun)
    if (webSocket.current) {
      webSocket.current.close();
      webSocket.current = null;
    }
    if (audioContext.current) {
      audioContext.current.close();
      audioContext.current = null;
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
      message.event_id = message.event_id || crypto.randomUUID();
      
      // Try WebSocket first (Aliyun)
      if (webSocket.current && webSocket.current.readyState === WebSocket.OPEN) {
        webSocket.current.send(JSON.stringify(message));
      } 
      // Fall back to DataChannel (OpenAI)
      else if (dataChannel) {
        dataChannel.send(JSON.stringify(message));
      } else {
        console.error(
          "Failed to send message - no connection available",
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
          const config = getCurrentConfig();
          const sessionUpdate = {
            type: "session.update",
            session: {
              tools: TOOLS,
              instructions: INSTRUCTIONS,
              voice: config.voice,
              turn_detection: {
                type: "server_vad",
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 200
              },
              input_audio_format: "pcm16",
              output_audio_format: "pcm16",
              input_audio_transcription: ACTIVE_PROVIDER === "openai" ? {
                model: "whisper-1"
              } : undefined
            },
          };
          sendClientEvent(sessionUpdate);
          console.log(`${ACTIVE_PROVIDER.toUpperCase()} session update sent:`, sessionUpdate);
        } catch (error) {
          console.error("Failed to send session update:", error);
        }
      });
    }
  }, [dataChannel, sendClientEvent]);

  // Cleanup effect
  useEffect(() => {
    return () => {
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
    // Check if we have an active connection (either WebSocket or DataChannel)
    const hasConnection = (webSocket.current && webSocket.current.readyState === WebSocket.OPEN) || dataChannel;
    
    if (!isSessionActive || !hasConnection) {
      console.error("Cannot send text: session not active or no connection");
      console.error("Session active:", isSessionActive);
      console.error("WebSocket state:", webSocket.current?.readyState);
      console.error("DataChannel:", !!dataChannel);
      return;
    }

    console.log("Sending text message:", text);

    // Note: Don't send response.cancel before the first message
    // It causes an error if there's no ongoing response
    // Only cancel if we're interrupting an ongoing response
    
    // Send text message using conversation.item.create (OpenAI-compatible format)
    // Aliyun Qwen-Omni-Realtime supports OpenAI-compatible API format
    const messageEvent = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{
          type: "input_text",
          text: text
        }]
      }
    };
    
    console.log("Sending text message event:", JSON.stringify(messageEvent, null, 2));
    sendClientEvent(messageEvent);

    // Send response.create to trigger the model to generate a response
    const responseEvent = {
      type: "response.create"
    };
    console.log("Triggering response generation");
    sendClientEvent(responseEvent);

    console.log("Text message sent successfully");
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
      />
      <Logs messages={logs} />
    </div>
  );
}
