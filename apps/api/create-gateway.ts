import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const agent = await prisma.agent.create({
    data: {
      name: 'Local AI Gateway',
      token: 'demo_token_123',
      status: 'online'
    }
  });
  console.log('Gateway created:', agent);
}

main().finally(() => prisma.$disconnect());
