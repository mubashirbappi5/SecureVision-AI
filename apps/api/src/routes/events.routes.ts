import { Router } from 'express';
import { prisma } from '../db/prisma';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const events = await prisma.detectionEvent.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100,
      include: { camera: true }
    });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

export default router;
