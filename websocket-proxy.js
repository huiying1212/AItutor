/**
 * WebSocket Proxy Server for Aliyun Qwen-Omni-Realtime
 * 
 * This proxy server forwards WebSocket connections from the browser to Aliyun's
 * WebSocket API, adding the required Authorization header that browsers cannot set.
 * 
 * Usage:
 *   node websocket-proxy.js
 * 
 * Then update components/app.tsx to connect to:
 *   ws://localhost:8080?model=MODEL_NAME&apiKey=YOUR_API_KEY
 */

const WebSocket = require('ws');
const http = require('http');
const url = require('url');

const PORT = process.env.WS_PROXY_PORT || 8080;

// Create HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket Proxy Server for Aliyun Qwen-Omni-Realtime\n');
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

wss.on('connection', (clientWs, req) => {
  const queryParams = url.parse(req.url, true).query;
  const model = queryParams.model;
  const apiKey = queryParams.apiKey;
  const workspace = queryParams.workspace;
  
  console.log(`[${new Date().toISOString()}] New client connection`);
  console.log(`  Model: ${model}`);
  console.log(`  API Key: ${apiKey ? '***' + apiKey.slice(-4) : 'missing'}`);
  
  if (!model || !apiKey) {
    console.error('  Error: Missing model or apiKey parameter');
    clientWs.close(1008, 'Missing model or apiKey parameter');
    return;
  }
  
  // Construct Aliyun WebSocket URL
  const aliyunWsUrl = `wss://dashscope.aliyuncs.com/api-ws/v1/realtime?model=${model}`;
  
  // Prepare headers
  const headers = {
    'Authorization': `Bearer ${apiKey}`
  };
  
  if (workspace) {
    headers['X-DashScope-WorkSpace'] = workspace;
  }
  
  console.log(`  Connecting to Aliyun: ${aliyunWsUrl}`);
  
  // Create connection to Aliyun
  let aliyunWs;
  try {
    aliyunWs = new WebSocket(aliyunWsUrl, { headers });
  } catch (error) {
    console.error('  Error creating Aliyun WebSocket:', error);
    clientWs.close(1011, 'Failed to connect to Aliyun');
    return;
  }
  
  // Buffer for messages received before Aliyun connection is ready
  const messageBuffer = [];
  
  // Forward messages from client to Aliyun
  clientWs.on('message', (data, isBinary) => {
    if (aliyunWs.readyState === WebSocket.OPEN) {
      aliyunWs.send(data, { binary: isBinary });
      // Log message type if it's JSON
      if (!isBinary) {
        try {
          const msg = JSON.parse(data.toString());
          console.log(`  Client -> Aliyun: ${msg.type || 'unknown'}`);
        } catch (e) {
          console.log(`  Client -> Aliyun: non-JSON text (${data.length} bytes)`);
        }
      } else {
        console.log(`  Client -> Aliyun: binary data (${data.length} bytes)`);
      }
    } else if (aliyunWs.readyState === WebSocket.CONNECTING) {
      // Buffer messages while connecting
      console.log('  Buffering message until Aliyun connection is ready...');
      messageBuffer.push({ data, isBinary });
    } else {
      console.warn('  Warning: Aliyun WebSocket not open, message dropped');
    }
  });
  
  // Forward messages from Aliyun to client
  aliyunWs.on('message', (data, isBinary) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      // Always send as string to avoid Blob issues in browser
      if (isBinary) {
        // Convert binary to string if needed, or send as-is
        clientWs.send(data, { binary: false }); // Send as text to avoid Blob
        console.log(`  Aliyun -> Client: binary data converted to text (${data.length} bytes)`);
      } else {
        clientWs.send(data);
        // Log message type if it's JSON
        try {
          const msg = JSON.parse(data.toString());
          console.log(`  Aliyun -> Client: ${msg.type || 'unknown'}`);
        } catch (e) {
          console.log(`  Aliyun -> Client: non-JSON text (${data.length} bytes)`);
        }
      }
    }
  });
  
  // Handle Aliyun connection open
  aliyunWs.on('open', () => {
    console.log('  Connected to Aliyun successfully');
    
    // Send any buffered messages
    if (messageBuffer.length > 0) {
      console.log(`  Sending ${messageBuffer.length} buffered message(s)...`);
      messageBuffer.forEach(({ data, isBinary }) => {
        aliyunWs.send(data, { binary: isBinary });
        try {
          const msg = JSON.parse(data.toString());
          console.log(`  Client -> Aliyun (buffered): ${msg.type || 'unknown'}`);
        } catch (e) {
          // Ignore parse errors for buffered messages
        }
      });
      messageBuffer.length = 0; // Clear buffer
    }
  });
  
  // Handle errors
  aliyunWs.on('error', (error) => {
    console.error('  Aliyun WebSocket error:', error.message);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close(1011, 'Aliyun connection error');
    }
  });
  
  clientWs.on('error', (error) => {
    console.error('  Client WebSocket error:', error.message);
    if (aliyunWs.readyState === WebSocket.OPEN) {
      aliyunWs.close();
    }
  });
  
  // Handle connection closures
  clientWs.on('close', (code, reason) => {
    console.log(`  Client disconnected: ${code} ${reason || ''}`);
    if (aliyunWs.readyState === WebSocket.OPEN || aliyunWs.readyState === WebSocket.CONNECTING) {
      aliyunWs.close();
    }
  });
  
  aliyunWs.on('close', (code, reason) => {
    console.log(`  Aliyun disconnected: ${code} ${reason || ''}`);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close(code, reason);
    }
  });
});

// Start server
server.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('WebSocket Proxy Server for Aliyun Qwen-Omni-Realtime');
  console.log('='.repeat(60));
  console.log(`Listening on: ws://localhost:${PORT}`);
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log('');
  console.log('Usage in browser:');
  console.log(`  ws://localhost:${PORT}?model=MODEL_NAME&apiKey=YOUR_API_KEY`);
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

