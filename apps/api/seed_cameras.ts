import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  const count = await prisma.camera.count();
  if (count === 0) {
    const cam = await prisma.camera.create({
      data: {
        id: 'demo_cam_01',
        name: 'Front Door Camera (Demo)',
        sourceType: 'webcam',
        url: '0',
      }
    });
    console.log('Seeded camera:', cam.name);
  } else {
    console.log('Cameras already exist.');
  }
}

seed().catch(console.error).finally(() => prisma.$disconnect());
