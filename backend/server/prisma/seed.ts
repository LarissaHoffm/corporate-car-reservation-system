import { PrismaClient, Role, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function upsertUser(opts: { email: string; password: string; role: Role; status?: UserStatus }) {
  const { email, password, role, status = 'ACTIVE' } = opts;
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  return prisma.user.upsert({
    where: { email },
    update: { passwordHash, role, status },
    create: { email, passwordHash, role, status },
  });
}

async function main() {
  const admin = await upsertUser({
    email: 'admin@reservcar.com',
    password: 'Admin123!',
    role: 'ADMIN',
  });

  const approver = await upsertUser({
    email: 'approver@reservcar.com',
    password: 'Approver123!',
    role: 'APPROVER',
  });

  const requester = await upsertUser({
    email: 'requester@reservcar.com',
    password: 'Requester123!',
    role: 'REQUESTER',
  });

  console.log('Seed concluída:');
  console.log(`- ADMIN     -> ${admin.email} / Admin123!`);
  console.log(`- APPROVER  -> ${approver.email} / Approver123!`);
  console.log(`- REQUESTER -> ${requester.email} / Requester123!`);
}

main()
  .catch((e) => {
    console.error('Seed falhou:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
