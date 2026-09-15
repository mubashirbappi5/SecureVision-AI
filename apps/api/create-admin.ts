import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@securevision.com';
  const password = 'admin';

  // Check if user exists
  let user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    const hashedPassword = await bcrypt.hash(password, 10);
    user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: 'System Admin'
      }
    });
    console.log('User created successfully:', email);
  } else {
    // Update password just in case
    const hashedPassword = await bcrypt.hash(password, 10);
    user = await prisma.user.update({
      where: { email },
      data: { password: hashedPassword }
    });
    console.log('User password updated:', email);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
