const {
  PrismaClient,
  Role,
  ChecklistItemType,
  UserStatus,
} = require('@prisma/client');
const argon2 = require('argon2');

const prisma = new PrismaClient();

/**
 * Tenant único do sistema
 */
async function ensureTenant(name) {
  return prisma.tenant.upsert({
    where: { name },
    update: {},
    create: { name },
  });
}

/**
 * Filiais por tenant (chave única: tenantId + name)
 */
async function ensureBranch(tenantId, name) {
  return prisma.branch.upsert({
    where: { tenantId_name: { tenantId, name } },
    update: {},
    create: { tenantId, name },
  });
}

/**
 * Departamentos por tenant (código de 3 letras por tenant)
 */
async function ensureDepartment(tenantId, code, name) {
  const existing = await prisma.department.findFirst({
    where: { tenantId, code },
  });

  if (existing) {
    return { created: false, department: existing };
  }

  const department = await prisma.department.create({
    data: {
      tenantId,
      code,
      name,
    },
  });

  return { created: true, department };
}

/**
 * Usuários seed 
 */
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

/**
 * Checklist Template padrão (Retorno Padrão)
 */
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
          {
            label: 'Nível de combustível (%)',
            type: ChecklistItemType.NUMBER,
            required: true,
            order: 1,
          },
          {
            label: 'Quilometragem (km)',
            type: ChecklistItemType.NUMBER,
            required: true,
            order: 2,
          },
          {
            label: 'Há avarias aparentes?',
            type: ChecklistItemType.BOOLEAN,
            required: true,
            order: 3,
          },
          {
            label: 'Observações',
            type: ChecklistItemType.TEXT,
            required: false,
            order: 4,
          },
        ],
      },
    },
  });
  return { created: true, tpl };
}

/**
 * Lista de filiais (Matriz + capitais do Brasil)
 * – IDs de verdade continuam sendo UUIDs no banco
 */
const BRANCH_NAMES = [
  'Matriz',
  'Rio Branco (AC)',
  'Maceió (AL)',
  'Macapá (AP)',
  'Manaus (AM)',
  'Salvador (BA)',
  'Fortaleza (CE)',
  'Brasília (DF)',
  'Vitória (ES)',
  'Goiânia (GO)',
  'São Luís (MA)',
  'Cuiabá (MT)',
  'Campo Grande (MS)',
  'Belo Horizonte (MG)',
  'Belém (PA)',
  'João Pessoa (PB)',
  'Curitiba (PR)',
  'Recife (PE)',
  'Teresina (PI)',
  'Rio de Janeiro (RJ)',
  'Natal (RN)',
  'Porto Alegre (RS)',
  'Porto Velho (RO)',
  'Boa Vista (RR)',
  'Florianópolis (SC)',
  'São Paulo (SP)',
  'Aracaju (SE)',
  'Palmas (TO)',
];

/**
 * Departamentos padrão 
 */
const DEPARTMENTS = [
  { code: 'ADM', name: 'Administração' },
  { code: 'FIN', name: 'Financeiro' },
  { code: 'RHU', name: 'Recursos Humanos' },
  { code: 'OPE', name: 'Operações' },
  { code: 'COM', name: 'Comercial / Vendas' },
  { code: 'MKT', name: 'Marketing' },
  { code: 'LOG', name: 'Logística' },
  { code: 'TEC', name: 'Tecnologia da Informação' },
  { code: 'JUR', name: 'Jurídico' },
];

async function main() {
  const log = [];

  // ===== Tenant =====
  const tenant = await ensureTenant('ReservCar');
  log.push({ kind: 'tenant', name: tenant.name, action: 'KEEP/CREATE' });

  // ===== Branches (Matriz + capitais) =====
  let matrizBranch = null;
  for (const name of BRANCH_NAMES) {
    const branch = await ensureBranch(tenant.id, name);
    log.push({ kind: 'branch', name: branch.name, action: 'KEEP/CREATE' });
    if (branch.name === 'Matriz') {
      matrizBranch = branch;
    }
  }

  if (!matrizBranch) {
    matrizBranch = await ensureBranch(tenant.id, 'Matriz');
  }

  // ===== Departamentos =====
  for (const dep of DEPARTMENTS) {
    const { created, department } = await ensureDepartment(
      tenant.id,
      dep.code,
      dep.name,
    );
    log.push({
      kind: 'department',
      code: department.code,
      action: created ? 'CREATE' : 'KEEP',
    });
  }

  // ===== Usuários padrão =====
  for (const spec of [
    {
      email: 'admin@reservcar.com',
      name: 'Admin',
      role: Role.ADMIN,
      password: 'Admin123!',
    },
    {
      email: 'approver@reservcar.com',
      name: 'Approver',
      role: Role.APPROVER,
      password: 'Approver123!',
    },
    {
      email: 'requester@reservcar.com',
      name: 'Requester',
      role: Role.REQUESTER,
      password: 'Requester123!',
    },
  ]) {
    const { created, user } = await ensureUser({
      ...spec,
      tenantId: tenant.id,
      branchId: matrizBranch.id,
    });
    log.push({
      kind: 'user',
      email: user.email,
      action: created ? 'CREATE' : 'KEEP',
    });
  }

  // ===== Checklist Template padrão =====
  {
    const { created, tpl } = await ensureChecklistTemplate({
      tenantId: tenant.id,
      name: 'Retorno Padrão',
    });
    log.push({
      kind: 'checklistTemplate',
      name: tpl.name,
      action: created ? 'CREATE' : 'KEEP',
    });
  }

  const summary = log.reduce((acc, r) => {
    const key = `${r.kind}:${r.action}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  console.log('✅ Seed concluído (tenant, branches, departments, users, checklist)');
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
