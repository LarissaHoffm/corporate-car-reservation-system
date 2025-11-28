import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let prisma: any;
  let storage: any;
  let reservations: any;

  const baseActor = {
    userId: 'u1',
    role: 'REQUESTER' as const,
    tenantId: 't1',
    branchId: 'b1',
  };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
      reservation: {
        findUnique: jest.fn(),
      },
      document: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    storage = {
      save: jest.fn(),
      read: jest.fn(),
    };

    reservations = {
      maybeCompleteReservation: jest.fn(),
    };

    service = new DocumentsService(prisma, storage, reservations);
  });

  /* -------------------- resolveTenantBranch (privado) -------------------- */

  describe('resolveTenantBranch (interno)', () => {
    it('deve retornar tenant/branch passados sem consultar usuário', async () => {
      const result = await (service as any).resolveTenantBranch(
        'u1',
        'tenant-explicit',
        'branch-explicit',
      );

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(result).toEqual({
        tenantId: 'tenant-explicit',
        branchId: 'branch-explicit',
      });
    });

    it('deve resolver tenant/branch a partir do usuário quando não vierem no argumento', async () => {
      prisma.user.findUnique.mockResolvedValue({
        tenantId: 't-user',
        branchId: 'b-user',
      });

      const result = await (service as any).resolveTenantBranch('u1');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'u1' },
        select: { tenantId: true, branchId: true },
      });
      expect(result).toEqual({
        tenantId: 't-user',
        branchId: 'b-user',
      });
    });

    it('deve lançar ForbiddenException quando usuário não existir', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        (service as any).resolveTenantBranch('u1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  /* -------------------- uploadToReservation -------------------- */

  describe('uploadToReservation', () => {
    const baseFile = {
      buffer: Buffer.from('file-content'),
      mimetype: 'image/jpeg',
      originalname: 'comprovante.jpg',
    };

    const reservation = {
      id: 'r1',
      userId: 'u1',
      tenantId: 't1',
    };

    it('deve lançar BadRequestException para mimetype inválido', async () => {
      const params: any = {
        reservationId: 'r1',
        actor: baseActor,
        file: { ...baseFile, mimetype: 'text/plain' },
        dto: { type: 'RECEIPT' },
      };

      await expect(service.uploadToReservation(params)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('deve lançar BadRequestException quando arquivo excede 5MB', async () => {
      const bigBuffer = Buffer.alloc(5 * 1024 * 1024 + 1);

      const params: any = {
        reservationId: 'r1',
        actor: baseActor,
        file: { ...baseFile, buffer: bigBuffer },
        dto: { type: 'RECEIPT' },
      };

      await expect(service.uploadToReservation(params)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('deve lançar BadRequestException para nome de arquivo inválido', async () => {
      const params: any = {
        reservationId: 'r1',
        actor: baseActor,
        file: { ...baseFile, originalname: 'evil/../file.jpg' },
        dto: { type: 'RECEIPT' },
      };

      await expect(service.uploadToReservation(params)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('deve lançar NotFoundException quando reserva não existe', async () => {
      prisma.reservation.findUnique.mockResolvedValue(null);

      const params: any = {
        reservationId: 'r1',
        actor: baseActor,
        file: baseFile,
        dto: { type: 'RECEIPT' },
      };

      await expect(service.uploadToReservation(params)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('deve lançar ForbiddenException quando tenant do ator não bate com o da reserva', async () => {
      prisma.reservation.findUnique.mockResolvedValue({
        ...reservation,
        tenantId: 't-other',
      });

      const params: any = {
        reservationId: 'r1',
        actor: { ...baseActor, tenantId: 't1' },
        file: baseFile,
        dto: { type: 'RECEIPT' },
      };

      await expect(service.uploadToReservation(params)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('REQUESTER deve lançar ForbiddenException quando não for dono da reserva', async () => {
      prisma.reservation.findUnique.mockResolvedValue({
        ...reservation,
        userId: 'other-user',
      });

      const params: any = {
        reservationId: 'r1',
        actor: baseActor,
        file: baseFile,
        dto: { type: 'RECEIPT' },
      };

      await expect(service.uploadToReservation(params)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('deve salvar arquivo e criar documento com metadados quando parâmetros são válidos', async () => {
      prisma.reservation.findUnique.mockResolvedValue(reservation);

      storage.save.mockResolvedValue({
        url: 'http://local/uploads/doc-1.jpg',
        size: 1234,
      });

      const createdDoc = {
        id: 'd1',
        type: 'OTHER',
        url: 'http://local/uploads/doc-1.jpg',
        status: 'PENDING',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        reservationId: 'r1',
        userId: 'u1',
      };

      prisma.document.create.mockResolvedValue(createdDoc);

      const params: any = {
        reservationId: 'r1',
        actor: baseActor,
        file: baseFile,
        dto: {}, // sem type => deve cair em OTHER
      };

      const result = await service.uploadToReservation(params);

      expect(storage.save).toHaveBeenCalledWith({
        buffer: baseFile.buffer,
        mime: baseFile.mimetype,
        originalName: baseFile.originalname,
      });

      expect(prisma.document.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 't1',
            reservationId: 'r1',
            userId: 'u1',
            type: 'OTHER',
            url: 'http://local/uploads/doc-1.jpg',
            metadata: expect.objectContaining({
              filename: baseFile.originalname,
              mimetype: baseFile.mimetype,
              size: 1234,
            }),
          }),
          select: {
            id: true,
            type: true,
            url: true,
            status: true,
            createdAt: true,
            reservationId: true,
            userId: true,
          },
        }),
      );

      expect(result).toEqual(createdDoc);
    });
  });

  /* -------------------- listByReservation -------------------- */

  describe('listByReservation', () => {
    it('deve lançar NotFoundException quando reserva não existir ou for de outro tenant', async () => {
      prisma.reservation.findUnique.mockResolvedValue(null);

      await expect(
        service.listByReservation(
          { userId: 'u1', role: 'REQUESTER', tenantId: 't1' },
          'r1',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('REQUESTER deve lançar ForbiddenException quando não for dono da reserva', async () => {
      prisma.reservation.findUnique.mockResolvedValue({
        id: 'r1',
        userId: 'other-user',
        tenantId: 't1',
      });

      await expect(
        service.listByReservation(
          { userId: 'u1', role: 'REQUESTER', tenantId: 't1' },
          'r1',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('deve retornar documentos da reserva quando ator tem permissão', async () => {
      prisma.reservation.findUnique.mockResolvedValue({
        id: 'r1',
        userId: 'u1',
        tenantId: 't1',
      });

      const docs = [
        {
          id: 'd1',
          type: 'RECEIPT',
          url: 'url-1',
          status: 'PENDING',
          createdAt: new Date('2024-01-01T00:00:00Z'),
        },
      ];

      prisma.document.findMany.mockResolvedValue(docs);

      const actor = {
        userId: 'u1',
        role: 'REQUESTER',
        tenantId: 't1',
      };

      const result = await service.listByReservation(actor, 'r1');

      expect(prisma.document.findMany).toHaveBeenCalledWith({
        where: { reservationId: 'r1' },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          url: true,
          status: true,
          createdAt: true,
        },
      });

      expect(result).toEqual(docs);
    });
  });

  /* -------------------- listInbox -------------------- */

  describe('listInbox', () => {
    it('deve listar documentos do tenant ordenados por data', async () => {
      const docs = [
        {
          id: 'd1',
          type: 'RECEIPT',
          status: 'PENDING',
          createdAt: new Date('2024-01-01T00:00:00Z'),
          metadata: {},
          reservation: {
            id: 'r1',
            origin: 'A',
            destination: 'B',
            startAt: new Date('2024-01-01T10:00:00Z'),
            user: {
              id: 'u1',
              name: 'User',
              email: 'user@test',
            },
          },
        },
      ];

      prisma.document.findMany.mockResolvedValue(docs);

      const actor = {
        tenantId: 't1',
        role: 'APPROVER' as const,
        branchId: null,
      };

      const result = await service.listInbox(actor);

      expect(prisma.document.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 't1',
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          status: true,
          createdAt: true,
          metadata: true,
          reservation: {
            select: {
              id: true,
              origin: true,
              destination: true,
              startAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      expect(result).toEqual(docs);
    });
  });

  /* -------------------- get -------------------- */

  describe('get', () => {
    const actor = {
      tenantId: 't1',
      role: 'REQUESTER',
      userId: 'u1',
    };

    it('deve lançar NotFoundException quando documento não existir ou for de outro tenant', async () => {
      prisma.document.findUnique.mockResolvedValue(null);

      await expect(service.get(actor, 'd1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('REQUESTER deve lançar ForbiddenException quando documento não for do usuário', async () => {
      prisma.document.findUnique.mockResolvedValue({
        id: 'd1',
        tenantId: 't1',
        reservationId: 'r1',
        userId: 'other-user',
        type: 'RECEIPT',
        url: 'url',
        status: 'PENDING',
        validatedById: null,
        validatedAt: null,
        metadata: {},
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      });

      await expect(service.get(actor, 'd1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('deve retornar documento quando ator tem permissão', async () => {
      const doc = {
        id: 'd1',
        tenantId: 't1',
        reservationId: 'r1',
        userId: 'u1',
        type: 'RECEIPT',
        url: 'url',
        status: 'PENDING',
        validatedById: null,
        validatedAt: null,
        metadata: {},
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      };

      prisma.document.findUnique.mockResolvedValue(doc);

      const result = await service.get(actor, 'd1');

      expect(prisma.document.findUnique).toHaveBeenCalledWith({
        where: { id: 'd1' },
        select: {
          id: true,
          tenantId: true,
          reservationId: true,
          userId: true,
          type: true,
          url: true,
          status: true,
          validatedById: true,
          validatedAt: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      expect(result).toEqual(doc);
    });
  });

  /* -------------------- getFile -------------------- */

  describe('getFile', () => {
    const actor = {
      tenantId: 't1',
      role: 'REQUESTER',
      userId: 'u1',
    };

    it('deve lançar NotFoundException quando documento não existir ou for de outro tenant', async () => {
      prisma.document.findUnique.mockResolvedValue(null);

      await expect(service.getFile(actor, 'd1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('REQUESTER deve lançar ForbiddenException quando documento não for do usuário', async () => {
      prisma.document.findUnique.mockResolvedValue({
        id: 'd1',
        tenantId: 't1',
        userId: 'other-user',
        url: 'http://local/uploads/file-1.pdf',
        metadata: {},
      });

      await expect(service.getFile(actor, 'd1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('deve retornar bin, mimetype e filename quando ator tem permissão', async () => {
      prisma.document.findUnique.mockResolvedValue({
        id: 'd1',
        tenantId: 't1',
        userId: 'u1',
        url: 'http://local/uploads/file-1.pdf',
        metadata: {
          mimetype: 'application/pdf',
          filename: 'nota-fiscal.pdf',
        },
      });

      const buf = Buffer.from('file-binary');
      storage.read.mockResolvedValue(buf);

      const result = await service.getFile(actor, 'd1');

      // storage.read deve receber apenas o basename da URL
      expect(storage.read).toHaveBeenCalledWith('file-1.pdf');

      expect(result).toEqual({
        bin: buf,
        mimetype: 'application/pdf',
        filename: 'nota-fiscal.pdf',
      });
    });

    it('deve usar defaults quando metadata estiver vazia', async () => {
      prisma.document.findUnique.mockResolvedValue({
        id: 'd1',
        tenantId: 't1',
        userId: 'u1',
        url: 'http://local/uploads/file-2.bin',
        metadata: {},
      });

      const buf = Buffer.from('file-binary-2');
      storage.read.mockResolvedValue(buf);

      const result = await service.getFile(actor, 'd1');

      expect(storage.read).toHaveBeenCalledWith('file-2.bin');

      expect(result).toEqual({
        bin: buf,
        mimetype: 'application/octet-stream',
        filename: 'file-2.bin',
      });
    });
  });

  /* -------------------- validateDocument -------------------- */

  describe('validateDocument', () => {
    const actor = {
      userId: 'approver-1',
      tenantId: 't1',
      role: 'APPROVER' as const,
    };

    it('deve lançar NotFoundException quando documento não existir ou for de outro tenant', async () => {
      prisma.document.findUnique.mockResolvedValue(null);

      await expect(
        service.validateDocument('d1', { result: 'APPROVED' } as any, actor),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deve atualizar status, registrar validador e chamar maybeCompleteReservation', async () => {
      prisma.document.findUnique.mockResolvedValue({
        id: 'd1',
        tenantId: 't1',
        reservationId: 'r1',
      });

      const updated = {
        id: 'd1',
        status: 'APPROVED',
        validatedById: 'approver-1',
        validatedAt: new Date('2024-01-01T00:00:00Z'),
        reservationId: 'r1',
      };

      prisma.document.update.mockResolvedValue(updated);

      const result = await service.validateDocument(
        'd1',
        { result: 'APPROVED' } as any,
        actor,
      );

      expect(prisma.document.update).toHaveBeenCalledWith({
        where: { id: 'd1' },
        data: expect.objectContaining({
          status: 'APPROVED',
          validatedById: 'approver-1',
        }),
        select: {
          id: true,
          status: true,
          validatedById: true,
          validatedAt: true,
          reservationId: true,
        },
      });

      expect(reservations.maybeCompleteReservation).toHaveBeenCalledWith(
        'r1',
        'approver-1',
      );

      expect(result).toEqual(updated);
    });

    it('não deve chamar maybeCompleteReservation quando reservationId é null', async () => {
      prisma.document.findUnique.mockResolvedValue({
        id: 'd1',
        tenantId: 't1',
        reservationId: null,
      });

      const updated = {
        id: 'd1',
        status: 'REJECTED',
        validatedById: 'approver-1',
        validatedAt: new Date('2024-01-01T00:00:00Z'),
        reservationId: null,
      };

      prisma.document.update.mockResolvedValue(updated);

      const result = await service.validateDocument(
        'd1',
        { result: 'REJECTED' } as any,
        actor,
      );

      expect(reservations.maybeCompleteReservation).not.toHaveBeenCalled();
      expect(result).toEqual(updated);
    });
  });
});
