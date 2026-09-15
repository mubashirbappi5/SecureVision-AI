import { Router } from 'express';
import { prisma } from '../db/prisma';
import { authenticateToken } from '../middlewares/auth';

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
  const { name, sourceType, url, agentId } = req.body;
  try {
    const camera = await prisma.camera.create({
      data: {
        name,
        sourceType,
        url,
        agentId
      }
    });
    res.status(201).json(camera);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create camera' });
  }
});

export default router;
