/**
 * WebSocket Proxy Server for AI Realtime APIs
 * 
 * This proxy server forwards WebSocket connections from the browser to various AI providers'
 * WebSocket APIs, adding the required Authorization header that browsers cannot set.
 * 
 * Supported providers:
 * - Aliyun (DashScope)
 * - StepFun (阶跃星辰)
 * 
 * Usage:
 *   node websocket-proxy.js
 * 
 * Then update components/app.tsx to connect to:
 *   ws://localhost:8080?model=MODEL_NAME&apiKey=YOUR_API_KEY&provider=PROVIDER_NAME
 */

const WebSocket = require('ws');
const http = require('http');
const url = require('url');

const PORT = process.env.WS_PROXY_PORT || 8080;

// Provider configurations
const PROVIDERS = {
  aliyun: {
    name: 'Aliyun DashScope',
    baseUrl: 'wss://dashscope.aliyuncs.com/api-ws/v1/realtime',
    getUrl: (model) => `wss://dashscope.aliyuncs.com/api-ws/v1/realtime?model=${model}`,
    getHeaders: (apiKey, workspace) => {
      const headers = { 'Authorization': `Bearer ${apiKey}` };
      if (workspace) headers['X-DashScope-WorkSpace'] = workspace;
      return headers;
    }
  },
  stepfun: {
    name: 'StepFun',
    baseUrl: 'wss://api.stepfun.com/v1/realtime',
    getUrl: (model) => `wss://api.stepfun.com/v1/realtime?model=${model}`,
    getHeaders: (apiKey) => ({ 'Authorization': `Bearer ${apiKey}` })
  }
};

// Create HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket Proxy Server for AI Realtime APIs\nSupported: Aliyun, StepFun\n');
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

wss.on('connection', (clientWs, req) => {
  const queryParams = url.parse(req.url, true).query;
  const model = queryParams.model;
  const apiKey = queryParams.apiKey;
  const workspace = queryParams.workspace;
  const provider = queryParams.provider || 'aliyun'; // Default to aliyun for backward compatibility
  
  console.log(`[${new Date().toISOString()}] New client connection`);
  console.log(`  Provider: ${provider}`);
  console.log(`  Model: ${model}`);
  console.log(`  API Key: ${apiKey ? '***' + apiKey.slice(-4) : 'missing'}`);
  
  if (!model || !apiKey) {
    console.error('  Error: Missing model or apiKey parameter');
    clientWs.close(1008, 'Missing model or apiKey parameter');
    return;
  }
  
  const providerConfig = PROVIDERS[provider];
  if (!providerConfig) {
    console.error(`  Error: Unknown provider: ${provider}`);
    clientWs.close(1008, `Unknown provider: ${provider}`);
    return;
  }
  
  // Construct provider WebSocket URL
  const providerWsUrl = providerConfig.getUrl(model);
  
  // Prepare headers
  const headers = providerConfig.getHeaders(apiKey, workspace);
  
  console.log(`  Connecting to ${providerConfig.name}: ${providerWsUrl}`);
  
  // Create connection to provider
  let providerWs;
  try {
    providerWs = new WebSocket(providerWsUrl, { headers });
  } catch (error) {
    console.error(`  Error creating ${providerConfig.name} WebSocket:`, error);
    clientWs.close(1011, `Failed to connect to ${providerConfig.name}`);
    return;
  }
  
  // Buffer for messages received before provider connection is ready
  const messageBuffer = [];
  
  // Forward messages from client to provider
  clientWs.on('message', (data, isBinary) => {
    if (providerWs.readyState === WebSocket.OPEN) {
      providerWs.send(data, { binary: isBinary });
      // Log message type if it's JSON
      if (!isBinary) {
        try {
          const msg = JSON.parse(data.toString());
          console.log(`  Client -> ${providerConfig.name}: ${msg.type || 'unknown'}`);
        } catch (e) {
          console.log(`  Client -> ${providerConfig.name}: non-JSON text (${data.length} bytes)`);
        }
      } else {
        console.log(`  Client -> ${providerConfig.name}: binary data (${data.length} bytes)`);
      }
    } else if (providerWs.readyState === WebSocket.CONNECTING) {
      // Buffer messages while connecting
      console.log(`  Buffering message until ${providerConfig.name} connection is ready...`);
      messageBuffer.push({ data, isBinary });
    } else {
      console.warn(`  Warning: ${providerConfig.name} WebSocket not open, message dropped`);
    }
  });
  
  // Forward messages from provider to client
  providerWs.on('message', (data, isBinary) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      // Always send as string to avoid Blob issues in browser
      if (isBinary) {
        // Convert binary to string if needed, or send as-is
        clientWs.send(data, { binary: false }); // Send as text to avoid Blob
        console.log(`  ${providerConfig.name} -> Client: binary data converted to text (${data.length} bytes)`);
      } else {
        clientWs.send(data);
        // Log message type if it's JSON
        try {
          const msg = JSON.parse(data.toString());
          console.log(`  ${providerConfig.name} -> Client: ${msg.type || 'unknown'}`);
        } catch (e) {
          console.log(`  ${providerConfig.name} -> Client: non-JSON text (${data.length} bytes)`);
        }
      }
    }
  });
  
  // Handle provider connection open
  providerWs.on('open', () => {
    console.log(`  Connected to ${providerConfig.name} successfully`);
    
    // Send any buffered messages
    if (messageBuffer.length > 0) {
      console.log(`  Sending ${messageBuffer.length} buffered message(s)...`);
      messageBuffer.forEach(({ data, isBinary }) => {
        providerWs.send(data, { binary: isBinary });
        try {
          const msg = JSON.parse(data.toString());
          console.log(`  Client -> ${providerConfig.name} (buffered): ${msg.type || 'unknown'}`);
        } catch (e) {
          // Ignore parse errors for buffered messages
        }
      });
      messageBuffer.length = 0; // Clear buffer
    }
  });
  
  // Handle errors
  providerWs.on('error', (error) => {
    console.error(`  ${providerConfig.name} WebSocket error:`, error.message);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close(1011, `${providerConfig.name} connection error`);
    }
  });
  
  clientWs.on('error', (error) => {
    console.error('  Client WebSocket error:', error.message);
    if (providerWs.readyState === WebSocket.OPEN) {
      providerWs.close();
    }
  });
  
  // Handle connection closures
  clientWs.on('close', (code, reason) => {
    console.log(`  Client disconnected: ${code} ${reason || ''}`);
    if (providerWs.readyState === WebSocket.OPEN || providerWs.readyState === WebSocket.CONNECTING) {
      providerWs.close();
    }
  });
  
  providerWs.on('close', (code, reason) => {
    console.log(`  ${providerConfig.name} disconnected: ${code} ${reason || ''}`);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close(code, reason);
    }
  });
});

// Start server
server.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('WebSocket Proxy Server for AI Realtime APIs');
  console.log('='.repeat(60));
  console.log(`Listening on: ws://localhost:${PORT}`);
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log('');
  console.log('Supported providers:');
  Object.keys(PROVIDERS).forEach(key => {
    console.log(`  - ${key}: ${PROVIDERS[key].name}`);
  });
  console.log('');
  console.log('Usage in browser:');
  console.log(`  ws://localhost:${PORT}?model=MODEL_NAME&apiKey=YOUR_API_KEY&provider=PROVIDER_NAME`);
  console.log('');
  console.log('Press Ctrl+C to stop');
  console.log('='.repeat(60));
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down gracefully...');
  wss.clients.forEach((client) => {
    client.close(1001, 'Server shutting down');
  });
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

