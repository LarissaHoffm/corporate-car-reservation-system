import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/infra/prisma.service';
import * as argon2 from 'argon2';

const E2E_REQUESTER_EMAIL = 'e2e-requester@local.test';
const E2E_REQUESTER_PASSWORD = 'E2e-Requester-123!';
const E2E_APPROVER_EMAIL = 'e2e-approver@local.test';
const E2E_APPROVER_PASSWORD = 'E2e-Approver-123!';

jest.setTimeout(30000);

async function seedE2EData(prisma: PrismaService) {
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
        throw new Error(
            'Nenhum tenant encontrado para E2E. Rode o seed padrão antes dos testes E2E.',
        );
    }

    let branch = await prisma.branch.findFirst({
        where: { tenantId: tenant.id },
    });

    if (!branch) {
        branch = await prisma.branch.create({
            data: {
                tenantId: tenant.id,
                name: 'Filial E2E',
            },
        });
    }

    const requesterPasswordHash = await argon2.hash(E2E_REQUESTER_PASSWORD);
    const approverPasswordHash = await argon2.hash(E2E_APPROVER_PASSWORD);

    // Requester E2E
    await prisma.user.upsert({
        where: { email: E2E_REQUESTER_EMAIL },
        update: {
            tenantId: tenant.id,
            branchId: branch.id,
            role: 'REQUESTER',
            passwordHash: requesterPasswordHash,
        },
        create: {
            tenantId: tenant.id,
            branchId: branch.id,
            name: 'E2E Requester',
            email: E2E_REQUESTER_EMAIL,
            role: 'REQUESTER',
            passwordHash: requesterPasswordHash,
        },
    });

    // Approver E2E
    await prisma.user.upsert({
        where: { email: E2E_APPROVER_EMAIL },
        update: {
            tenantId: tenant.id,
            branchId: branch.id,
            role: 'APPROVER',
            passwordHash: approverPasswordHash,
        },
        create: {
            tenantId: tenant.id,
            branchId: branch.id,
            name: 'E2E Approver',
            email: E2E_APPROVER_EMAIL,
            role: 'APPROVER',
            passwordHash: approverPasswordHash,
        },
    });

    // Carro AVAILABLE para o fluxo
    let car = await prisma.car.findFirst({
        where: { tenantId: tenant.id, plate: 'E2E-0001' },
    });

    if (!car) {
        car = await prisma.car.create({
            data: {
                tenantId: tenant.id,
                plate: 'E2E-0001', // carro dedicado para E2E
                model: 'E2E Car',
                color: 'Branco',
                mileage: 0,
                status: 'AVAILABLE' as any,
                branchId: branch.id,
            },
        });
    } else {
        // garante que o carro de E2E esteja AVAILABLE
        await prisma.car.update({
            where: { id: car.id },
            data: { status: 'AVAILABLE' as any },
        });
    }

    // Limpa reservas PENDING/APPROVED ligadas a esse carro E2E
    await prisma.reservation.deleteMany({
        where: {
            tenantId: tenant.id,
            carId: car.id,
            status: { in: ['PENDING', 'APPROVED'] as any },
        },
    });

    return { tenant, branch, car };
}


describe('App E2E', () => {
    let app: INestApplication;

    beforeAll(async () => {
        if (process.env.E2E_DATABASE_URL) {
            process.env.DATABASE_URL = process.env.E2E_DATABASE_URL;
        }

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();

        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                transform: true,
            }),
        );

        await app.init();

        const prisma = app.get(PrismaService);
        await seedE2EData(prisma);
    });

    afterAll(async () => {
        await app.close();
    });

    it('GET /health deve responder', async () => {
        const res = await request(app.getHttpServer()).get('/health');
        expect([200, 204, 302]).toContain(res.status);
    });

    it('fluxo completo: requester cria reserva e approver aprova com carro AVAILABLE', async () => {
        const now = Date.now();
        const startAt = new Date(now + 60 * 60 * 1000).toISOString(); // +1h
        const endAt = new Date(now + 2 * 60 * 60 * 1000).toISOString(); // +2h

        // 1) Login requester 
        const requesterLogin = await request(app.getHttpServer())
            .post('/auth/login')
            .send({
                email: E2E_REQUESTER_EMAIL,
                password: E2E_REQUESTER_PASSWORD,
            });

        if (![200, 201].includes(requesterLogin.status)) {
            throw new Error(
                `Falha no login do requester E2E: status=${requesterLogin.status} body=${JSON.stringify(
                    requesterLogin.body,
                )}`,
            );
        }

        const requesterToken =
            requesterLogin.body.accessToken ??
            requesterLogin.body.token ??
            requesterLogin.body?.data?.accessToken;

        expect(requesterToken).toBeTruthy();

        // 2) Requester cria reserva PENDING
        const createRes = await request(app.getHttpServer())
            .post('/reservations')
            .set('Authorization', `Bearer ${requesterToken}`)
            .send({
                origin: 'Matriz E2E',
                destination: 'Cliente X E2E',
                startAt,
                endAt,
                purpose: 'Visita comercial E2E',
            });

        if (![200, 201].includes(createRes.status)) {
            throw new Error(
                `Falha ao criar reserva E2E: status=${createRes.status} body=${JSON.stringify(
                    createRes.body,
                )}`,
            );
        }

        const reservationId = createRes.body.id;
        expect(reservationId).toBeTruthy();
        expect(String(createRes.body.status)).toMatch(/^PENDING/);

        // 3) Login approver
        const approverLogin = await request(app.getHttpServer())
            .post('/auth/login')
            .send({
                email: E2E_APPROVER_EMAIL,
                password: E2E_APPROVER_PASSWORD,
            });

        if (![200, 201].includes(approverLogin.status)) {
            throw new Error(
                `Falha no login do approver E2E: status=${approverLogin.status} body=${JSON.stringify(
                    approverLogin.body,
                )}`,
            );
        }

        const approverToken =
            approverLogin.body.accessToken ??
            approverLogin.body.token ??
            approverLogin.body?.data?.accessToken;

        expect(approverToken).toBeTruthy();

        // 4) Approver lista carros e escolhe um AVAILABLE
        const carsRes = await request(app.getHttpServer())
            .get('/cars')
            .set('Authorization', `Bearer ${approverToken}`);

        if (carsRes.status !== 200) {
            throw new Error(
                `Falha ao listar carros E2E: status=${carsRes.status} body=${JSON.stringify(
                    carsRes.body,
                )}`,
            );
        }

        const cars = Array.isArray(carsRes.body) ? carsRes.body : [];

        // tenta primeiro o carro de E2E; se não achar, cai em qualquer AVAILABLE
        const availableCar =
            cars.find((c: any) => c.plate === 'E2E-0001') ||
            cars.find((c: any) => c.status === 'AVAILABLE');

        if (!availableCar) {
            throw new Error(
                'Nenhum carro AVAILABLE encontrado para o E2E. Verifique o seed de carros.',
            );
        }


        // 5) Approver aprova a reserva vinculando o carro
        const approveRes = await request(app.getHttpServer())
            .patch(`/reservations/${reservationId}/approve`)
            .set('Authorization', `Bearer ${approverToken}`)
            .send({ carId: availableCar.id });

        if (![200, 201].includes(approveRes.status)) {
            throw new Error(
                `Falha ao aprovar reserva E2E: status=${approveRes.status} body=${JSON.stringify(
                    approveRes.body,
                )}`,
            );
        }

        // 6) GET /reservations/:id confirma status e carro vinculado
        const finalRes = await request(app.getHttpServer())
            .get(`/reservations/${reservationId}`)
            .set('Authorization', `Bearer ${approverToken}`);

        if (finalRes.status !== 200) {
            throw new Error(
                `Falha ao buscar reserva E2E: status=${finalRes.status} body=${JSON.stringify(
                    finalRes.body,
                )}`,
            );
        }

        expect(String(finalRes.body.status)).toMatch(/^APPROVED/);

        const returnedCarId =
            finalRes.body.car?.id ??
            finalRes.body.carId ??
            finalRes.body.assignedCarId;

        expect(returnedCarId).toBe(availableCar.id);
    });
});
