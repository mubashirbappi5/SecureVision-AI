import { Router } from 'express';
import { prisma } from '../db/prisma';
import { authenticateToken } from '../middlewares/auth';
import crypto from 'crypto';

const router = Router();

// Only authenticated dashboard users can list or create agents
router.get('/', authenticateToken, async (req, res) => {
  try {
    const agents = await prisma.agent.findMany({
      include: { cameras: true }
    });
    res.json(agents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const { name } = req.body;
  try {
    const token = crypto.randomBytes(32).toString('hex');
    const agent = await prisma.agent.create({
      data: {
        name,
        token
      }
    });
    res.status(201).json(agent);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create agent' });
  }
});

// Agent heartbeat (used by the python local agent using its token)
router.post('/heartbeat', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    res.status(401).json({ error: 'Agent token is missing' });
    return;
  }

  try {
    const agent = await prisma.agent.findUnique({ where: { token } });
    if (!agent) {
      res.status(401).json({ error: 'Invalid agent token' });
      return;
    }

    const { cpu, ram, gpu, version } = req.body;

    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        status: 'online',
        lastHeartbeat: new Date(),
        cpu,
        ram,
        gpu,
        version
      }
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update heartbeat' });
  }
});

export default router;
