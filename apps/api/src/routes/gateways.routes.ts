import { Router } from 'express';
import { prisma } from '../db/prisma';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const gateways = await prisma.agent.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        version: true,
        lastHeartbeat: true,
        createdAt: true,
      }
    });
    res.json(gateways);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch gateways' });
  }
});

// A route for manual gateway registration from the UI if needed
router.post('/', async (req, res) => {
  const { name } = req.body;
  try {
    const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    const agent = await prisma.agent.create({
      data: {
        name,
        token
      }
    });
    res.status(201).json(agent);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create gateway' });
  }
});

export default router;
