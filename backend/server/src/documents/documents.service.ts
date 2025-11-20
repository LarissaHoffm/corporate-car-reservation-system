import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../infra/prisma.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { ValidateDocumentDto } from './dto/validate-document.dto';
import { LocalStorage } from '../infra/storage/local.storage';
import * as path from 'path';
import { ReservationsService } from '../reservations/reservations.service';

const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_BYTES = 5 * 1024 * 1024;

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: LocalStorage,
    private readonly reservations: ReservationsService,
  ) {}

  private async resolveTenantBranch(
    userId: string,
    tenantId?: string,
    branchId?: string,
  ) {
    if (tenantId && branchId) return { tenantId, branchId };
    const me = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tenantId: true, branchId: true },
    });
    if (!me) throw new ForbiddenException('Usuário não encontrado');
    return {
      tenantId: tenantId ?? me.tenantId,
      branchId: branchId ?? me.branchId!,
    };
  }

  // Upload                                                             

  async uploadToReservation(params: {
    reservationId: string;
    actor: {
      userId: string;
      role: 'REQUESTER' | 'APPROVER' | 'ADMIN';
      tenantId?: string;
      branchId?: string;
    };
    file: { buffer: Buffer; mimetype: string; originalname: string };
    dto: UploadDocumentDto;
  }) {
    const { reservationId, actor, file, dto } = params;

    if (!ALLOWED.includes(file.mimetype)) {
      throw new BadRequestException('Tipo de arquivo não permitido');
    }
    if (file.buffer.length > MAX_BYTES) {
      throw new BadRequestException('Arquivo excede 5MB');
    }
    if (!/^[\w.\- ]+$/.test(file.originalname)) {
      throw new BadRequestException('Nome do arquivo inválido');
    }

    const r = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { id: true, userId: true, tenantId: true },
    });

    if (!r) {
      throw new NotFoundException('Reserva não encontrada');
    }

    // evita anexar documento em reserva de outro tenant
    if (actor.tenantId && r.tenantId !== actor.tenantId) {
      throw new ForbiddenException('Sem permissão para esta reserva');
    }

    if (actor.role === 'REQUESTER' && r.userId !== actor.userId) {
      throw new ForbiddenException(
        'Você só pode enviar documentos das suas reservas',
      );
    }

    const saved = await this.storage.save({
      buffer: file.buffer,
      mime: file.mimetype,
      originalName: file.originalname,
    });

    return this.prisma.document.create({
      data: {
        tenantId: r.tenantId,
        reservationId: r.id,
        userId: actor.userId,
        type: dto.type ?? 'OTHER',
        url: saved.url,
        metadata: {
          filename: file.originalname,
          mimetype: file.mimetype,
          size: saved.size,
        } as any,
      } as any,
      select: {
        id: true,
        type: true,
        url: true,
        status: true,
        createdAt: true,
        reservationId: true,
        userId: true,
      },
    });
  }

 
  // Listagens                                                        


  async listByReservation(
    actor: { userId: string; role: string; tenantId: string },
    reservationId: string,
  ) {
    const r = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { id: true, userId: true, tenantId: true },
    });
    if (!r || r.tenantId !== actor.tenantId) {
      throw new NotFoundException('Reserva não encontrada');
    }
    if (actor.role === 'REQUESTER' && r.userId !== actor.userId) {
      throw new ForbiddenException('Sem permissão');
    }

    return this.prisma.document.findMany({
      where: { reservationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        url: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async listInbox(actor: {
    tenantId: string;
    role: 'APPROVER' | 'ADMIN';
    branchId?: string | null;
  }) {
    return this.prisma.document.findMany({
      where: {
        tenantId: actor.tenantId,
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
  }

  //Get / File                                                         
  

  async get(
    actor: { tenantId: string; role: string; userId: string },
    id: string,
  ) {
    const d = await this.prisma.document.findUnique({
      where: { id },
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
    if (!d || d.tenantId !== actor.tenantId) {
      throw new NotFoundException('Documento não encontrado');
    }
    if (actor.role === 'REQUESTER' && d.userId !== actor.userId) {
      throw new ForbiddenException('Sem permissão');
    }
    return d;
  }

  async getFile(
    actor: { tenantId: string; role: string; userId: string },
    id: string,
  ) {
    const d = await this.prisma.document.findUnique({
      where: { id },
      select: {
        id: true,
        tenantId: true,
        userId: true,
        url: true,
        metadata: true,
      },
    });
    if (!d || d.tenantId !== actor.tenantId) {
      throw new NotFoundException('Documento não encontrado');
    }
    if (actor.role === 'REQUESTER' && d.userId !== actor.userId) {
      throw new ForbiddenException('Sem permissão');
    }

    const storageKey = path.basename(d.url);
    const bin = await this.storage.read(storageKey);

    const meta = (d.metadata ?? {}) as any;
    const mimetype = meta.mimetype ?? 'application/octet-stream';
    const filename = meta.filename ?? storageKey;

    return { bin, mimetype, filename };
  }

  // Validação                                                          */
  
  async validateDocument(
    id: string,
    dto: ValidateDocumentDto,
    actor: { userId: string; tenantId: string; role: 'APPROVER' | 'ADMIN' },
  ) {
    const d = await this.prisma.document.findUnique({
      where: { id },
      select: {
        id: true,
        tenantId: true,
        reservationId: true,
      },
    });
    if (!d || d.tenantId !== actor.tenantId) {
      throw new NotFoundException('Documento não encontrado');
    }

    const updated = await this.prisma.document.update({
      where: { id },
      data: {
        status: dto.result,
        validatedById: actor.userId,
        validatedAt: new Date(),
      } as any,
      select: {
        id: true,
        status: true,
        validatedById: true,
        validatedAt: true,
        reservationId: true,
      },
    });

    if (updated.reservationId) {
      await this.reservations.maybeCompleteReservation(
        updated.reservationId,
        actor.userId,
      );
    }

    return updated;
  }
}
