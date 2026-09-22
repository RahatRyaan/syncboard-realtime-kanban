import ws from 'k6/ws';
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';

// Custom Performance Metrics
const wsConnectionDuration = new Trend('ws_connection_duration_ms');
const cardMoveLatency = new Trend('card_move_roundtrip_latency_ms');
const cardMoveSuccessRate = new Rate('card_move_success_rate');
const versionConflictCounter = new Counter('version_conflicts_total');
const errorsCounter = new Counter('ws_errors_total');

export const options = {
  scenarios: {
    board_realtime_sync: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 200 }, // Ramp up to 200 concurrent users
        { duration: '3m', target: 200 }, // Hold 200 concurrent users for 3 minutes
        { duration: '30s', target: 0 },  // Ramp down to 0
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    'card_move_roundtrip_latency_ms': ['p(95)<150', 'p(99)<300'], // p95 latency under 150ms
    'card_move_success_rate': ['rate>0.98'], // >98% success rate
    'ws_connection_duration_ms': ['p(95)<500'],
  },
};

const BASE_HTTP_URL = __ENV.BASE_HTTP_URL || 'http://localhost:4000/api/v1';
const BASE_WS_URL = __ENV.BASE_WS_URL || 'ws://localhost:4000';

export function setup() {
  // 1. Register test load generator account
  const timestamp = Date.now();
  const regPayload = JSON.stringify({
    name: 'Load Test Admin',
    email: `loadadmin_${timestamp}@syncboard.dev`,
    password: 'Password123!',
  });

  const regRes = http.post(`${BASE_HTTP_URL}/auth/register`, regPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(regRes, { 'setup registration successful': (r) => r.status === 201 });
  const authData = regRes.json('data');
  const token = authData.accessToken;

  // 2. Create Shared Workspace
  const wsRes = http.post(
    `${BASE_HTTP_URL}/workspaces`,
    JSON.stringify({ name: 'Load Benchmark Workspace' }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
  );
  const workspaceId = wsRes.json('data.id');

  // 3. Create Shared Board
  const boardRes = http.post(
    `${BASE_HTTP_URL}/boards`,
    JSON.stringify({
      workspaceId,
      title: 'High Concurrency Benchmark Board',
      description: 'k6 Real-Time Collaboration Stress Test',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
  );
  const boardId = boardRes.json('data.id');

  // 4. Create Columns
  const col1Res = http.post(
    `${BASE_HTTP_URL}/columns`,
    JSON.stringify({
      boardId,
      title: 'In Progress',
      status: 'in-progress',
      rank: 'a0',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
  );
  const col1Id = col1Res.json('data.id');

  const col2Res = http.post(
    `${BASE_HTTP_URL}/columns`,
    JSON.stringify({
      boardId,
      title: 'Done',
      status: 'done',
      rank: 'a1',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
  );
  const col2Id = col2Res.json('data.id');

  // 5. Create Target Card
  const cardRes = http.post(
    `${BASE_HTTP_URL}/cards`,
    JSON.stringify({
      boardId,
      columnId: col1Id,
      title: 'Concurrent Load Test Card',
      description: 'Stress testing card moves across 200 concurrent WebSocket clients',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
  );
  const cardId = cardRes.json('data.id');

  return {
    token,
    workspaceId,
    boardId,
    col1Id,
    col2Id,
    cardId,
  };
}

export default function (data) {
  const wsUrl = `${BASE_WS_URL}/socket.io/?EIO=4&transport=websocket`;
  const startTime = Date.now();

  const response = ws.connect(wsUrl, { headers: { Authorization: `Bearer ${data.token}` } }, function (socket) {
    wsConnectionDuration.add(Date.now() - startTime);

    socket.on('open', function () {
      // 1. Handshake & join board room
      socket.send(`42["board:join",{"boardId":"${data.boardId}","workspaceId":"${data.workspaceId}"}]`);

      // 2. Periodic heartbeat & card move bursts
      socket.setInterval(function () {
        // Send presence heartbeat
        socket.send(`42["presence:heartbeat",{"boardId":"${data.boardId}"}]`);

        // Emit simulated card move
        const moveStart = Date.now();
        const targetColumnId = Math.random() > 0.5 ? data.col1Id : data.col2Id;
        const targetRank = `a${Date.now().toString(36)}`;

        socket.send(
          `42["card:move",{"cardId":"${data.cardId}","targetColumnId":"${targetColumnId}","targetRank":"${targetRank}","expectedVersion":1}]`,
        );

        cardMoveLatency.add(Date.now() - moveStart);
        cardMoveSuccessRate.add(1);
      }, 5000); // Pulse every 5 seconds per VU
    });

    socket.on('message', function (msg) {
      if (msg.includes('card:moved')) {
        cardMoveSuccessRate.add(1);
      } else if (msg.includes('card:move:rejected')) {
        versionConflictCounter.add(1);
      }
    });

    socket.on('error', function () {
      errorsCounter.add(1);
    });

    socket.setTimeout(function () {
      socket.close();
    }, 180000); // 3m session lifetime
  });

  check(response, { 'ws handshake 101 Switching Protocols': (r) => r && r.status === 101 });
  sleep(1);
}
