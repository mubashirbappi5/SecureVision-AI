import { Router } from 'express';
import { prisma } from '../db/prisma';
import { authenticateToken } from '../middlewares/auth';
import { encrypt, decrypt } from '../utils/crypto';
import { io } from '../index'; // We will export `io` from index.ts

const router = Router();

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const cameras = await prisma.camera.findMany({
      include: { zones: true }
    });
    res.json(cameras);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cameras' });
  }
});

router.post('/', async (req, res) => {
  const { name, sourceType, connectionMode, url, username, password, agentId } = req.body;
  try {
    const encryptedPassword = password ? encrypt(password) : null;
    
    const camera = await prisma.camera.create({
      data: {
        name,
        sourceType,
        connectionMode,
        url,
        username,
        encryptedPassword,
        agentId
      }
    });
    res.status(201).json(camera);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create camera' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const camera = await prisma.camera.findUnique({
      where: { id: req.params.id }
    });
    if (!camera) {
      return res.status(404).json({ error: 'Camera not found' });
    }
    res.json(camera);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch camera' });
  }
});

router.put('/:id', async (req, res) => {
  const { url, name, sourceType, connectionMode, username, password, agentId } = req.body;
  try {
    const dataToUpdate: any = {};
    if (url !== undefined) dataToUpdate.url = url;
    if (name !== undefined) dataToUpdate.name = name;
    if (sourceType !== undefined) dataToUpdate.sourceType = sourceType;
    if (connectionMode !== undefined) dataToUpdate.connectionMode = connectionMode;
    if (username !== undefined) dataToUpdate.username = username;
    if (password !== undefined) dataToUpdate.encryptedPassword = password ? encrypt(password) : null;
    if (agentId !== undefined) dataToUpdate.agentId = agentId;

    const camera = await prisma.camera.update({
      where: { id: req.params.id },
      data: dataToUpdate
    });
    res.json(camera);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update camera' });
  }
});

// Test Connection Endpoint
router.post('/test-connection', async (req, res) => {
  const { url, username, password, agentId } = req.body;
  
  if (!agentId) {
    return res.status(400).json({ error: 'Agent (Gateway) ID is required to test local connection.' });
  }

  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) {
    return res.status(404).json({ error: 'Agent (Gateway) not found.' });
  }
  if (agent.status !== 'online') {
    return res.status(400).json({ error: 'Agent (Gateway) is offline.' });
  }

  // We emit a test_rtsp_connection event to all clients, but they filter by agentId.
  // In a real app we'd map agentId -> Socket ID, but for this MVP we broadcast and use a timeout.
  
  const testId = Math.random().toString(36).substring(7);
  let handled = false;
  
  // Create a one-time listener for the response
  const timeoutId = setTimeout(() => {
    if (!handled) {
      handled = true;
      res.status(504).json({ error: 'Gateway timeout. Agent did not respond.' });
    }
  }, 10000); // 10s timeout

  const testListener = (response: any) => {
    if (response.testId === testId && !handled) {
      handled = true;
      clearTimeout(timeoutId);
      // Remove listener (handled inside socket.io, but we can't easily remove specific listener globally without reference, so we just check `handled`)
      if (response.success) {
        res.json({ success: true, message: 'Camera Connected Successfully' });
      } else {
        res.status(400).json({ error: response.error || 'Authentication Failed or Camera Offline' });
      }
    }
  };

  io.on('test_rtsp_response', testListener);
  io.emit('test_rtsp_connection', { testId, url, username, password, agentId });
});

export default router;
