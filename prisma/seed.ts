import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: {},
    create: {
      username: 'superadmin',
      password: hashedPassword,
      displayName: 'Super Admin',
      role: 'SUPER_ADMIN',
    },
  });
  console.log('Created super admin:', admin.username);
}
main().catch(console.error).finally(() => prisma.$disconnect());
