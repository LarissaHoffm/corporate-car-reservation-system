// backend/server/prisma/seed.ts
import { PrismaClient, Role, CarStatus, ChecklistItemType, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

/* ============================
   Utilidades p/ seed de Carros
   ============================ */
function randOf<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function genPlate(): string {
  // Formato Mercosul: ABC1D23
  const L = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const D = () => Math.floor(Math.random() * 10).toString();
  return `${L()}${L()}${L()}${D()}${L()}${D()}${D()}`;
}

/* ==========================================
   Seed de Carros (idempotente, por Branch)
   - Garante >=2 por branch e >=6 no total
   - Respeita @@unique([tenantId, plate])
   - Usa apenas AVAILABLE/IN_USE/MAINTENANCE
   ========================================== */
async function seedCars() {
  const branches = await prisma.branch.findMany({
    select: { id: true, tenantId: true },
  });

  if (branches.length === 0) {
    console.warn('Nenhuma Branch encontrada. Pular seed de carros.');
    return;
  }

  const MODELS = ['Onix', 'HB20', 'Argo', 'Gol', 'Cronos', 'Corolla', 'City', 'Kwid'];
  const COLORS = ['Prata', 'Branco', 'Preto', 'Cinza', 'Vermelho', 'Azul'];
  const STATUSES: CarStatus[] = [CarStatus.AVAILABLE, CarStatus.IN_USE, CarStatus.MAINTENANCE];

  // Garante ao menos 2 carros por branch
  for (const br of branches) {
    const existing = await prisma.car.count({
      where: { tenantId: br.tenantId, branchId: br.id },
    });
    const toCreate = Math.max(0, 2 - existing);
    if (toCreate === 0) continue;

    const batch = Array.from({ length: toCreate }).map(() => ({
      tenantId: br.tenantId,
      branchId: br.id,
      plate: genPlate(),
      model: randOf(MODELS),
      color: randOf(COLORS),
      mileage: Math.floor(Math.random() * 50000), // 0–50k
      status: randOf(STATUSES), // evitamos ACTIVE/INACTIVE aqui
    }));

    await prisma.car.createMany({ data: batch, skipDuplicates: true });
    console.log(`Branch ${br.id}: +${toCreate} carro(s) criado(s).`);
  }

  // Garante total >= 6 (somando todas as branches)
  const totalCars = await prisma.car.count();
  if (totalCars < 6) {
    const deficit = 6 - totalCars;
    const br = branches[0];
    const extras = Array.from({ length: deficit }).map(() => ({
      tenantId: br.tenantId,
      branchId: br.id,
      plate: genPlate(),
      model: randOf(MODELS),
      color: randOf(COLORS),
      mileage: Math.floor(Math.random() * 50000),
      status: randOf(STATUSES),
    }));
    await prisma.car.createMany({ data: extras, skipDuplicates: true });
    console.log(`Sistema: +${deficit} carro(s) extra(s) para atingir >= 6.`);
  }
}

async function main() {
  // Tenant
  const tenant = await prisma.tenant.upsert({
    where: { name: 'ReservCar' },
    update: {},
    create: { name: 'ReservCar' },
  });

  // Branch
  const branch = await prisma.branch.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Matriz' } },
    update: {},
    create: { name: 'Matriz', tenantId: tenant.id },
  });

  // Users
  const [adminHash, approverHash, requesterHash] = await Promise.all([
    argon2.hash('Admin123!', { type: argon2.argon2id }),
    argon2.hash('Approver123!', { type: argon2.argon2id }),
    argon2.hash('Requester123!', { type: argon2.argon2id }),
  ]);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@reservcar.com' },
    update: {
      passwordHash: adminHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      tenantId: tenant.id,
      branchId: branch.id,
    },
    create: {
      email: 'admin@reservcar.com',
      passwordHash: adminHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      tenantId: tenant.id,
      branchId: branch.id,
      name: 'Admin',
    },
  });

  const approver = await prisma.user.upsert({
    where: { email: 'approver@reservcar.com' },
    update: {
      passwordHash: approverHash,
      role: Role.APPROVER,
      status: UserStatus.ACTIVE,
      tenantId: tenant.id,
      branchId: branch.id,
    },
    create: {
      email: 'approver@reservcar.com',
      passwordHash: approverHash,
      role: Role.APPROVER,
      status: UserStatus.ACTIVE,
      tenantId: tenant.id,
      branchId: branch.id,
      name: 'Approver',
    },
  });

  const requester = await prisma.user.upsert({
    where: { email: 'requester@reservcar.com' },
    update: {
      passwordHash: requesterHash,
      role: Role.REQUESTER,
      status: UserStatus.ACTIVE,
      tenantId: tenant.id,
      branchId: branch.id,
    },
    create: {
      email: 'requester@reservcar.com',
      passwordHash: requesterHash,
      role: Role.REQUESTER,
      status: UserStatus.ACTIVE,
      tenantId: tenant.id,
      branchId: branch.id,
      name: 'Requester',
    },
  });

  // Car (fixo para referência)
  const car = await prisma.car.upsert({
    where: {
      car_plate_tenant_unique: {
        tenantId: tenant.id,
        plate: 'ABC1D23',
      },
    },
    update: {
      model: 'Fiat Cronos',
      color: 'Prata',
      mileage: 12000,
      status: CarStatus.AVAILABLE,
      branchId: branch.id,
    },
    create: {
      plate: 'ABC1D23',
      model: 'Fiat Cronos',
      color: 'Prata',
      mileage: 12000,
      status: CarStatus.AVAILABLE,
      tenantId: tenant.id,
      branchId: branch.id,
    },
  });

  // Completa a base de carros (>=2 por branch e >=6 no total)
  await seedCars();

  // Station
  let station = await prisma.station.findFirst({
    where: { tenantId: tenant.id, name: 'Posto Central' },
  });
  if (!station) {
    station = await prisma.station.create({
      data: {
        name: 'Posto Central',
        address: 'Rua Principal, 100 - Centro',
        tenantId: tenant.id,
        branchId: branch.id,
      },
    });
  }

  // Checklist template
  await prisma.checklistTemplate.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Retorno Padrão' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Retorno Padrão',
      items: {
        create: [
          { label: 'Nível de combustível (%)', type: ChecklistItemType.NUMBER, required: true, order: 1 },
          { label: 'Quilometragem (km)', type: ChecklistItemType.NUMBER, required: true, order: 2 },
          { label: 'Há avarias aparentes?', type: ChecklistItemType.BOOLEAN, required: true, order: 3 },
          { label: 'Observações', type: ChecklistItemType.TEXT, required: false, order: 4 },
        ],
      },
    },
  });

  console.log('✅ Seed concluído');
  console.table([
    { email: admin.email, role: admin.role, status: admin.status },
    { email: approver.email, role: approver.role, status: approver.status },
    { email: requester.email, role: requester.role, status: requester.status },
  ]);
}

main()
  .catch((e) => {
    console.error('❌ Seed falhou:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
