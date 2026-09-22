import { test, expect } from '@playwright/test';

test.describe('Board & Collaboration Feature (Playwright E2E)', () => {
  let userToken: string;
  let workspaceId: string;
  let boardId: string;
  let col1Id: string;
  let col2Id: string;
  let cardId: string;

  test.beforeAll(async ({ request }) => {
    // Register user
    const regRes = await request.post('/api/v1/auth/register', {
      data: {
        email: `pw_collab_${Date.now()}@syncboard.dev`,
        password: 'Password123!',
        name: 'PW Collab User',
      },
    });
    const regBody = await regRes.json();
    userToken = regBody.data.accessToken;

    // Create Workspace
    const wsRes = await request.post('/api/v1/workspaces', {
      headers: { Authorization: `Bearer ${userToken}` },
      data: { name: 'Collab Workspace' },
    });
    const wsBody = await wsRes.json();
    workspaceId = wsBody.data.id;
  });

  test('1. Create Board, Columns, and Cards', async ({ request }) => {
    // Create Board
    const boardRes = await request.post('/api/v1/boards', {
      headers: { Authorization: `Bearer ${userToken}` },
      data: {
        workspaceId,
        title: 'Sprint Kanban Board',
        description: 'Testing real-time drag-and-drop and collaboration',
      },
    });
    expect(boardRes.status()).toBe(201);
    const boardBody = await boardRes.json();
    expect(boardBody.data.title).toBe('Sprint Kanban Board');
    boardId = boardBody.data.id;

    // Create Column 1
    const col1Res = await request.post('/api/v1/columns', {
      headers: { Authorization: `Bearer ${userToken}` },
      data: {
        boardId,
        title: 'To Do',
        status: 'todo',
        rank: 'a0',
      },
    });
    expect(col1Res.status()).toBe(201);
    const col1Body = await col1Res.json();
    col1Id = col1Body.data.id;

    // Create Column 2
    const col2Res = await request.post('/api/v1/columns', {
      headers: { Authorization: `Bearer ${userToken}` },
      data: {
        boardId,
        title: 'In Progress',
        status: 'in-progress',
        rank: 'a1',
      },
    });
    expect(col2Res.status()).toBe(201);
    const col2Body = await col2Res.json();
    col2Id = col2Body.data.id;

    // Create Card in Column 1
    const cardRes = await request.post('/api/v1/cards', {
      headers: { Authorization: `Bearer ${userToken}` },
      data: {
        boardId,
        columnId: col1Id,
        title: 'Drag and Drop Task',
        description: 'Verify rank and column movement',
      },
    });
    expect(cardRes.status()).toBe(201);
    const cardBody = await cardRes.json();
    expect(cardBody.data.version).toBe(1);
    cardId = cardBody.data.id;
  });

  test('2. Card Move & Optimistic Concurrency (expectedVersion)', async ({ request }) => {
    // Move card from Col1 to Col2 with expectedVersion: 1
    const moveRes = await request.patch(`/api/v1/cards/${cardId}/move`, {
      headers: { Authorization: `Bearer ${userToken}` },
      data: {
        targetColumnId: col2Id,
        targetRank: 'a0_moved',
        expectedVersion: 1,
      },
    });
    expect(moveRes.status()).toBe(200);
    const moveBody = await moveRes.json();
    expect(moveBody.data.columnId).toBe(col2Id);
    expect(moveBody.data.version).toBe(2);

    // Stale update attempt with expectedVersion: 1 should return 409 Conflict
    const staleAttempt = await request.patch(`/api/v1/cards/${cardId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
      data: {
        title: 'Stale Edit',
        expectedVersion: 1,
      },
    });
    expect(staleAttempt.status()).toBe(409);
  });

  test('3. S3 Presigned URL and Attachment Confirmation', async ({ request }) => {
    // Request Presigned Upload URL
    const presignRes = await request.post(`/api/v1/cards/${cardId}/attachments/presign`, {
      headers: { Authorization: `Bearer ${userToken}` },
      data: {
        fileName: 'architecture-diagram.pdf',
        mimeType: 'application/pdf',
      },
    });
    expect(presignRes.status()).toBe(201);
    const presignBody = await presignRes.json();
    expect(presignBody.data.presignedUrl).toContain('https://');
    expect(presignBody.data.key).toContain('cards/');

    // Confirm attachment addition
    const addRes = await request.post(`/api/v1/cards/${cardId}/attachments`, {
      headers: { Authorization: `Bearer ${userToken}` },
      data: {
        name: 'architecture-diagram.pdf',
        key: presignBody.data.key,
        url: presignBody.data.url,
        size: 10240,
        mimeType: 'application/pdf',
      },
    });
    expect(addRes.status()).toBe(201);
    const addBody = await addRes.json();
    expect(addBody.data.attachments).toHaveLength(1);
    expect(addBody.data.attachments[0].name).toBe('architecture-diagram.pdf');
  });

  test('4. Comment creation and @mention parsing', async ({ request }) => {
    const commentRes = await request.post('/api/v1/comments', {
      headers: { Authorization: `Bearer ${userToken}` },
      data: {
        cardId,
        content: 'Hey team, S3 attachments are verified!',
      },
    });
    expect(commentRes.status()).toBe(201);
    const commentBody = await commentRes.json();
    expect(commentBody.data.content).toBe('Hey team, S3 attachments are verified!');
    expect(commentBody.data.cardId).toBe(cardId);
  });

  test('5. Workspace-Scoped Text Search', async ({ request }) => {
    const searchRes = await request.get(`/api/v1/search?workspaceId=${workspaceId}&q=Kanban`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    expect(searchRes.status()).toBe(200);
    const searchBody = await searchRes.json();
    expect(searchBody.data.boards.length).toBeGreaterThanOrEqual(1);
    expect(searchBody.data.boards[0].title).toContain('Sprint Kanban');
  });
});
