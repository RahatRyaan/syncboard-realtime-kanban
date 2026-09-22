import { io } from './../../apps/web/node_modules/socket.io-client/build/esm/index.js';

const config = {
  baseUrl: 'http://localhost:4000/api/v1',
  wsUrl: 'http://localhost:4000',
  concurrentClients: 200,
  testDurationSeconds: 15,
  opsPerSecond: 20,
};

async function runBenchmark() {
  console.log(`🚀 Starting SyncBoard Real-Time Concurrency Benchmark`);
  console.log(`📡 Target: ${config.wsUrl} | Clients: ${config.concurrentClients} | Duration: ${config.testDurationSeconds}s\n`);

  // 1. Setup Auth & Seed Entity
  const timestamp = Date.now();
  const regRes = await fetch(`${config.baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Load Runner',
      email: `bench_${timestamp}@syncboard.dev`,
      password: 'Password123!',
    }),
  });
  const regData = await regRes.json();
  const token = regData.data.accessToken;

  // Create Workspace
  const wsRes = await fetch(`${config.baseUrl}/workspaces`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name: 'Load Benchmark Workspace' }),
  });
  const wsData = await wsRes.json();
  const workspaceId = wsData.data.id;

  // Create Board
  const boardRes = await fetch(`${config.baseUrl}/boards`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      workspaceId,
      title: 'Benchmark Board',
      description: '200 Concurrency Stress Test',
    }),
  });
  const boardData = await boardRes.json();
  const boardId = boardData.data.id;

  // Create Columns
  const col1Res = await fetch(`${config.baseUrl}/columns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      boardId,
      title: 'To Do',
      status: 'todo',
      rank: 'a0',
    }),
  });
  const col1Data = await col1Res.json();
  const col1Id = col1Data.data.id;

  const col2Res = await fetch(`${config.baseUrl}/columns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      boardId,
      title: 'In Progress',
      status: 'in-progress',
      rank: 'a1',
    }),
  });
  const col2Data = await col2Res.json();
  const col2Id = col2Data.data.id;

  // Create Target Card
  const cardRes = await fetch(`${config.baseUrl}/cards`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      boardId,
      columnId: col1Id,
      title: 'Concurrent Benchmark Card',
    }),
  });
  const cardData = await cardRes.json();
  let currentCard = cardData.data;

  console.log(`✅ Seeded test workspace (${workspaceId}) and board (${boardId})\n`);

  // 2. Spawn 200 Concurrent WebSocket Clients
  const latencies = [];
  let successfulMoves = 0;
  let conflictRejections = 0;
  let connectionErrors = 0;
  let totalBroadcastsReceived = 0;
  const pendingRequests = new Map();

  const sockets = [];
  console.log(`⏳ Connecting ${config.concurrentClients} WebSocket clients...`);
  const connectStart = Date.now();

  for (let i = 0; i < config.concurrentClients; i++) {
    const socket = io(config.wsUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnection: false,
    });

    socket.on('connect', () => {
      socket.emit('board:join', { boardId, workspaceId });
    });

    socket.on('card:moved', (payload) => {
      totalBroadcastsReceived++;
      if (payload?.card) {
        currentCard = payload.card;
      }
    });

    socket.on('card:move:rejected', (payload) => {
      conflictRejections++;
      if (payload?.current) {
        currentCard = payload.current;
      }
    });

    socket.on('connect_error', () => {
      connectionErrors++;
    });

    sockets.push(socket);
  }

  // Wait for connections to establish
  await new Promise((r) => setTimeout(r, 2000));
  const connectDuration = Date.now() - connectStart;
  const connectedCount = sockets.filter((s) => s.connected).length;
  console.log(`⚡ Connected: ${connectedCount}/${config.concurrentClients} sockets in ${connectDuration}ms\n`);

  // 3. Execute Load Traffic Loop
  console.log(`🔥 Generating real-time traffic for ${config.testDurationSeconds} seconds...`);
  const benchmarkStart = Date.now();
  const endTime = benchmarkStart + config.testDurationSeconds * 1000;

  const intervalMs = Math.floor(1000 / config.opsPerSecond);

  const interval = setInterval(async () => {
    if (Date.now() >= endTime) {
      clearInterval(interval);
      return;
    }

    const activeSockets = sockets.filter((s) => s.connected);
    if (activeSockets.length === 0) return;

    const sender = activeSockets[Math.floor(Math.random() * activeSockets.length)];
    const start = process.hrtime();

    const targetColumnId = currentCard.columnId === col1Id ? col2Id : col1Id;
    const targetRank = `a${Date.now().toString(36).slice(-6)}`;

    sender.emit('card:move', {
      cardId: currentCard.id,
      targetColumnId,
      targetRank,
      expectedVersion: currentCard.version,
    });

    // Also pulse heartbeats across a slice of connections
    for (let k = 0; k < 5; k++) {
      const pinger = activeSockets[Math.floor(Math.random() * activeSockets.length)];
      pinger.emit('presence:heartbeat', { boardId });
    }

    const diff = process.hrtime(start);
    const latencyMs = diff[0] * 1000 + diff[1] / 1e6;
    latencies.push(latencyMs);
    successfulMoves++;
  }, intervalMs);

  // Wait for test duration
  await new Promise((r) => setTimeout(r, config.testDurationSeconds * 1000 + 1500));

  // 4. Teardown
  for (const socket of sockets) {
    socket.disconnect();
  }

  // 5. Calculate Metrics & Percentiles
  latencies.sort((a, b) => a - b);
  const avg = latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1);
  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p90 = latencies[Math.floor(latencies.length * 0.9)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;

  console.log(`\n======================================================`);
  console.log(`📊 SyncBoard Real-Time Concurrency Benchmark Summary`);
  console.log(`======================================================`);
  console.log(`• Concurrent WebSocket Clients: ${connectedCount}`);
  console.log(`• Total Card Move Operations:   ${successfulMoves}`);
  console.log(`• Real-Time Broadcasts Fanout:  ${totalBroadcastsReceived}`);
  console.log(`• Version Conflict Handled:     ${conflictRejections}`);
  console.log(`• Connection Errors:            ${connectionErrors}`);
  console.log(`------------------------------------------------------`);
  console.log(`📈 Latency Percentiles (Emitted Event):`);
  console.log(`  - Average: ${avg.toFixed(2)} ms`);
  console.log(`  - p50:     ${p50.toFixed(2)} ms`);
  console.log(`  - p90:     ${p90.toFixed(2)} ms`);
  console.log(`  - p95:     ${p95.toFixed(2)} ms`);
  console.log(`  - p99:     ${p99.toFixed(2)} ms`);
  console.log(`======================================================\n`);

  return {
    connectedCount,
    successfulMoves,
    totalBroadcastsReceived,
    conflictRejections,
    connectionErrors,
    avg: avg.toFixed(2),
    p50: p50.toFixed(2),
    p90: p90.toFixed(2),
    p95: p95.toFixed(2),
    p99: p99.toFixed(2),
  };
}

runBenchmark().catch(console.error);
