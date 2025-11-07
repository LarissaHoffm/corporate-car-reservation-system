const { PrismaClient, Role, CarStatus, ChecklistItemType, UserStatus } = require('@prisma/client');
const argon2 = require('argon2');

const prisma = new PrismaClient();

async function ensureTenant(name) {
  // upsert com update vazio NÃO altera registros existentes
  return prisma.tenant.upsert({
    where: { name },
    update: {},
    create: { name },
  });
}

async function ensureBranch(tenantId, name) {
  return prisma.branch.upsert({
    where: { tenantId_name: { tenantId, name } },
    update: {}, // não muda nada se já existir
    create: { tenantId, name },
  });
}

async function ensureUser({ email, name, role, tenantId, branchId, password }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { created: false, user: existing };
  }
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const user = await prisma.user.create({
    data: {
      email,
      name,
      role,
      status: UserStatus.ACTIVE,
      tenantId,
      branchId,
      passwordHash,
    },
  });
  return { created: true, user };
}

async function ensureCar({ tenantId, branchId, plate, model, color, mileage, status }) {
  const existing = await prisma.car.findFirst({ where: { tenantId, plate } });
  if (existing) {
    return { created: false, car: existing };
  }
  const car = await prisma.car.create({
    data: { tenantId, branchId, plate, model, color, mileage, status },
  });
  return { created: true, car };
}

async function ensureStation({ tenantId, branchId, name, address }) {
  const existing = await prisma.station.findFirst({ where: { tenantId, name } });
  if (existing) {
    return { created: false, station: existing };
  }
  const station = await prisma.station.create({
    data: { tenantId, branchId, name, address },
  });
  return { created: true, station };
}

async function ensureChecklistTemplate({ tenantId, name }) {
  const existing = await prisma.checklistTemplate.findUnique({
    where: { tenantId_name: { tenantId, name } },
  });
  if (existing) return { created: false, tpl: existing };

  const tpl = await prisma.checklistTemplate.create({
    data: {
      tenantId,
      name,
      items: {
        create: [
          { label: 'Nível de combustível (%)', type: ChecklistItemType.NUMBER, required: true, order: 1 },
          { label: 'Quilometragem (km)',      type: ChecklistItemType.NUMBER, required: true, order: 2 },
          { label: 'Há avarias aparentes?',   type: ChecklistItemType.BOOLEAN, required: true, order: 3 },
          { label: 'Observações',             type: ChecklistItemType.TEXT,    required: false, order: 4 },
        ],
      },
    },
  });
  return { created: true, tpl };
}

async function main() {
  const log = [];

  const tenant = await ensureTenant('ReservCar');
  const branch  = await ensureBranch(tenant.id, 'Matriz');
  for (const spec of [
    { email: 'admin@reservcar.com',    name: 'Admin',     role: Role.ADMIN,     password: 'Admin123!' },
    { email: 'approver@reservcar.com', name: 'Approver',  role: Role.APPROVER,  password: 'Approver123!' },
    { email: 'requester@reservcar.com',name: 'Requester', role: Role.REQUESTER, password: 'Requester123!' },
  ]) {
    const { created, user } = await ensureUser({
      ...spec, tenantId: tenant.id, branchId: branch.id,
    });
    log.push({ kind: 'user', email: user.email, action: created ? 'CREATE' : 'KEEP' });
  }

  {
    const { created, car } = await ensureCar({
      tenantId: tenant.id,
      branchId: branch.id,
      plate: 'ABC1D23',
      model: 'Fiat Cronos',
      color: 'Prata',
      mileage: 12000,
      status: CarStatus.AVAILABLE,
    });
    log.push({ kind: 'car', plate: car.plate, action: created ? 'CREATE' : 'KEEP' });
  }

  {
    const { created, station } = await ensureStation({
      tenantId: tenant.id,
      branchId: branch.id,
      name: 'Posto Central',
      address: 'Rua Principal, 100 - Centro',
    });
    log.push({ kind: 'station', name: station.name, action: created ? 'CREATE' : 'KEEP' });
  }

  {
    const { created, tpl } = await ensureChecklistTemplate({
      tenantId: tenant.id,
      name: 'Retorno Padrão',
    });
    log.push({ kind: 'checklistTemplate', name: tpl.name, action: created ? 'CREATE' : 'KEEP' });
  }

  // Saída 
  const summary = log.reduce((acc, r) => {
    const key = `${r.kind}:${r.action}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  console.log('✅ Seed concluído (create-only, sem atualizar existentes)');
  console.table(log);
  console.table([summary]);
}

main()
  .catch((e) => {
    console.error('❌ Seed falhou:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
