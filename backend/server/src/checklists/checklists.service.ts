import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ChecklistSubmissionKind,
  Role,
  ReservationStatus,
  CarStatus,
} from '@prisma/client';
import { PrismaService } from '../infra/prisma.service';
import { CreateChecklistTemplateDto } from './dto/create-checklist-template.dto';
import { UpdateChecklistTemplateDto } from './dto/update-checklist-template.dto';
import { SubmitChecklistDto } from './dto/submit-checklist.dto';

export interface AuthUser {
  id?: string;
  userId?: string;
  tenantId: string;
  role: Role;
  branchId?: string | null;
}

@Injectable()
export class ChecklistsService {
  constructor(private readonly prisma: PrismaService) {}

  private getUserId(actor: AuthUser): string {
    const userId = actor.userId ?? actor.id;
    if (!userId) {
      throw new BadRequestException(
        'Usuário autenticado inválido para submissão de checklist',
      );
    }
    return userId;
  }

  //  TEMPLATES (ADMIN)

  async createTemplate(actor: AuthUser, dto: CreateChecklistTemplateDto) {
    if (actor.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Somente ADMIN pode gerenciar templates de checklist',
      );
    }

    const userId = this.getUserId(actor);

    // valida se o carro existe e é do mesmo tenant
    const car = await this.prisma.car.findFirst({
      where: {
        id: dto.carId,
        tenantId: actor.tenantId,
      },
    });

    if (!car) {
      throw new BadRequestException('Carro inválido para este tenant');
    }

    const exists = await this.prisma.checklistTemplate.findFirst({
      where: {
        tenantId: actor.tenantId,
        carId: dto.carId,
      },
    });

    if (exists) {
      throw new ConflictException(
        'Já existe um template de checklist para este carro',
      );
    }

    const template = await this.prisma.checklistTemplate.create({
      data: {
        tenantId: actor.tenantId,
        name: dto.name,
        active: dto.active ?? true,
        carId: dto.carId,
        items: {
          create: dto.items.map((item, index) => ({
            label: item.label,
            type: item.type,
            required: item.required ?? true,
            options: item.options as any,
            order: item.order ?? index,
          })),
        },
      },
      include: {
        items: true,
        car: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId,
        action: 'CHECKLIST_TEMPLATE_CREATED',
        entity: 'ChecklistTemplate',
        entityId: template.id,
        metadata: {
          name: template.name,
          carId: template.carId,
          plate: template.car?.plate,
        },
      },
    });

    return template;
  }

  async listTemplates(actor: AuthUser, onlyActive = true, carId?: string) {
    return this.prisma.checklistTemplate.findMany({
      where: {
        tenantId: actor.tenantId,
        ...(onlyActive ? { active: true } : {}),
        ...(carId ? { carId } : {}),
      },
      orderBy: { name: 'asc' },
      include: { items: true, car: true },
    });
  }

  async updateTemplate(
    actor: AuthUser,
    templateId: string,
    dto: UpdateChecklistTemplateDto,
  ) {
    if (actor.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Somente ADMIN pode gerenciar templates de checklist',
      );
    }

    const userId = this.getUserId(actor);

    const template = await this.prisma.checklistTemplate.findFirst({
      where: {
        id: templateId,
        tenantId: actor.tenantId,
      },
      include: { items: true, car: true },
    });

    if (!template) {
      throw new NotFoundException('Template de checklist não encontrado');
    }

    let carId = template.carId;

    if (dto.carId && dto.carId !== template.carId) {
      const car = await this.prisma.car.findFirst({
        where: {
          id: dto.carId,
          tenantId: actor.tenantId,
        },
      });

      if (!car) {
        throw new BadRequestException('Carro inválido para este tenant');
      }

      const existsForCar = await this.prisma.checklistTemplate.findFirst({
        where: {
          tenantId: actor.tenantId,
          carId: dto.carId,
          NOT: { id: template.id },
        },
      });

      if (existsForCar) {
        throw new ConflictException(
          'Já existe um template de checklist para este carro',
        );
      }

      carId = dto.carId;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.items) {
        await tx.checklistTemplateItem.deleteMany({
          where: {
            templateId: template.id,
          },
        });
      }

      const result = await tx.checklistTemplate.update({
        where: { id: template.id },
        data: {
          name: dto.name ?? template.name,
          active: dto.active ?? template.active,
          carId,
          ...(dto.items && {
            items: {
              create: dto.items.map((item, index) => ({
                label: item.label,
                type: item.type,
                required: item.required ?? true,
                options: item.options as any,
                order: item.order ?? index,
              })),
            },
          }),
        },
        include: { items: true, car: true },
      });

      await tx.auditLog.create({
        data: {
          tenantId: actor.tenantId,
          userId,
          action: 'CHECKLIST_TEMPLATE_UPDATED',
          entity: 'ChecklistTemplate',
          entityId: template.id,
          metadata: {
            nameBefore: template.name,
            nameAfter: result.name,
            carIdBefore: template.carId,
            carIdAfter: result.carId,
          },
        },
      });

      return result;
    });

    return updated;
  }

  async setTemplateActive(actor: AuthUser, templateId: string, active: boolean) {
    if (actor.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Somente ADMIN pode gerenciar templates de checklist',
      );
    }

    const userId = this.getUserId(actor);

    const template = await this.prisma.checklistTemplate.findFirst({
      where: {
        id: templateId,
        tenantId: actor.tenantId,
      },
    });

    if (!template) {
      throw new NotFoundException('Template de checklist não encontrado');
    }

    const updated = await this.prisma.checklistTemplate.update({
      where: { id: template.id },
      data: { active },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId,
        action: active
          ? 'CHECKLIST_TEMPLATE_ACTIVATED'
          : 'CHECKLIST_TEMPLATE_DEACTIVATED',
        entity: 'ChecklistTemplate',
        entityId: template.id,
        metadata: {
          name: updated.name,
          carId: updated.carId,
        },
      },
    });

    return updated;
  }

  // SUBMISSÕES (REQUESTER / APPROVER)

  async submitChecklist(
    actor: AuthUser,
    reservationId: string,
    dto: SubmitChecklistDto,
  ) {
    const userId = this.getUserId(actor);

    const reservation = await this.prisma.reservation.findFirst({
      where: {
        id: reservationId,
        tenantId: actor.tenantId,
      },
      include: {
        tenant: true,
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reserva não encontrada');
    }

    if (!reservation.carId) {
      throw new BadRequestException(
        'Reserva não possui carro vinculado, não é possível enviar checklist',
      );
    }

    const template = await this.prisma.checklistTemplate.findFirst({
      where: {
        id: dto.templateId,
        tenantId: actor.tenantId,
        active: true,
      },
      include: { items: true },
    });

    if (!template) {
      throw new BadRequestException(
        'Template de checklist inválido para este tenant',
      );
    }

    if (template.carId !== reservation.carId) {
      throw new BadRequestException(
        'Checklist não corresponde ao carro vinculado à reserva',
      );
    }

    // Regras de quem pode enviar qual tipo de checklist
    if (dto.kind === ChecklistSubmissionKind.USER_RETURN) {
      if (actor.role !== Role.REQUESTER) {
        throw new ForbiddenException(
          'Somente usuários com perfil REQUESTER podem enviar checklist de devolução.',
        );
      }
    }

    if (dto.kind === ChecklistSubmissionKind.APPROVER_VALIDATION) {
      if (actor.role !== Role.APPROVER && actor.role !== Role.ADMIN) {
        throw new ForbiddenException(
          'Somente aprovadores podem validar devoluções',
        );
      }
      if (
        reservation.approverId &&
        reservation.approverId !== userId &&
        actor.role !== Role.ADMIN
      ) {
        throw new ForbiddenException('Você não é o aprovador desta reserva');
      }
    }

    // Garante que não haja submissão duplicada para o mesmo kind
    const existing = await this.prisma.checklistSubmission.findFirst({
      where: {
        tenantId: actor.tenantId,
        reservationId: reservation.id,
        kind: dto.kind,
      },
    });

    if (existing) {
      throw new ConflictException(
        'Já existe um checklist enviado para esta reserva e tipo',
      );
    }

    const rawPayload = dto.payload ?? {};
    let payload: any =
      typeof rawPayload === 'object' && rawPayload !== null
        ? rawPayload
        : { value: rawPayload };

    if (
      dto.kind === ChecklistSubmissionKind.APPROVER_VALIDATION &&
      dto.decision
    ) {
      payload = {
        ...payload,
        decision: dto.decision,
      };
    }

    const submission = await this.prisma.checklistSubmission.create({
      data: {
        kind: dto.kind,
        payload,
        tenant: {
          connect: { id: actor.tenantId },
        },
        reservation: {
          connect: { id: reservation.id },
        },
        template: {
          connect: { id: template.id },
        },
        submittedBy: {
          connect: { id: userId },
        },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        userId,
        action: 'CHECKLIST_SUBMITTED',
        entity: 'ChecklistSubmission',
        entityId: submission.id,
        metadata: {
          reservationId: reservation.id,
          kind: dto.kind,
        },
      },
    });

    // Se foi uma validação do APPROVER, tenta auto-concluir a reserva
    if (dto.kind === ChecklistSubmissionKind.APPROVER_VALIDATION) {
      await this.tryCompleteReservation(reservation.id, actor.tenantId, userId);
    }

    return submission;
  }

  async getReservationChecklists(actor: AuthUser, reservationId: string) {
    const userId = this.getUserId(actor);

    // REQUESTER só vê seus próprios; APPROVER/ADMIN podem ver todos do tenant
    const reservation = await this.prisma.reservation.findFirst({
      where: {
        id: reservationId,
        tenantId: actor.tenantId,
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reserva não encontrada');
    }

    if (actor.role === Role.REQUESTER && reservation.userId !== userId) {
      throw new ForbiddenException(
        'Você não pode visualizar checklists de outra pessoa',
      );
    }

    return this.prisma.checklistSubmission.findMany({
      where: {
        tenantId: actor.tenantId,
        reservationId: reservation.id,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  // Template vinculado ao carro da reserva
  async getTemplateForReservation(actor: AuthUser, reservationId: string) {
    const reservation = await this.prisma.reservation.findFirst({
      where: {
        id: reservationId,
        tenantId: actor.tenantId,
      },
      include: {
        car: true,
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reserva não encontrada');
    }

    if (!reservation.carId || !reservation.car) {
      throw new BadRequestException(
        'Reserva não possui carro vinculado, não há checklist configurado',
      );
    }

    const template = await this.prisma.checklistTemplate.findFirst({
      where: {
        tenantId: actor.tenantId,
        active: true,
        carId: reservation.carId,
      },
      include: {
        items: true,
        car: true,
      },
    });

    if (!template) {
      throw new NotFoundException(
        'Nenhum checklist configurado para o carro desta reserva',
      );
    }

    return template;
  }

  //Exclusão definitiva de template de checklist.
  async deleteTemplate(actor: AuthUser, id: string) {
    if (actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Apenas ADMIN pode remover templates.');
    }

    return this.prisma.$transaction(async (tx) => {
      const tpl = await tx.checklistTemplate.findUnique({
        where: { id },
        select: {
          id: true,
          tenantId: true,
          _count: {
            select: {
              ChecklistSubmission: true,
            },
          },
        },
      });

      if (!tpl || tpl.tenantId !== actor.tenantId) {
        throw new NotFoundException('Template não encontrado.');
      }

      if (tpl._count.ChecklistSubmission > 0) {
        throw new ConflictException(
          'Não é possível excluir um checklist que já foi usado em reservas. Você pode apenas inativá-lo.',
        );
      }

      await tx.checklistTemplateItem.deleteMany({
        where: { templateId: tpl.id },
      });

      await tx.checklistTemplate.delete({
        where: { id: tpl.id },
      });

      return { id: tpl.id, deleted: true };
    });
  }

  private normalizeValidationStatus(
    raw?: string | null,
  ): 'PENDING' | 'APPROVED' | 'REJECTED' {
    if (!raw) return 'PENDING';
    const s = String(raw).toUpperCase();

    if (s === 'APPROVED' || s === 'VALIDATED' || s === 'APPROVE') {
      return 'APPROVED';
    }

    if (s === 'REJECTED' || s === 'REJECT') {
      return 'REJECTED';
    }

    return 'PENDING';
  }

  private aggregateDocsStatusForReservation(docs: {
    type: string | null;
    status: string | null;
    createdAt: Date;
    updatedAt: Date | null;
  }[]): 'Pending' | 'InValidation' | 'PendingDocs' | 'Validated' {
    if (!docs.length) {
      return 'Pending';
    }

    const typed = docs.filter((d) => !!d.type);
    const source = typed.length > 0 ? typed : docs;

    type Agg = {
      latestTs: number;
      status: 'PENDING' | 'APPROVED' | 'REJECTED';
    };

    const byType = new Map<string, Agg>();

    source.forEach((doc, index) => {
      const key = doc.type ?? '__NO_TYPE__';
      const tsBase = doc.updatedAt ?? doc.createdAt;
      const ts =
        tsBase instanceof Date ? tsBase.getTime() : index;
      const status = this.normalizeValidationStatus(doc.status);

      const current = byType.get(key);
      if (!current || ts >= current.latestTs) {
        byType.set(key, { latestTs: ts, status });
      }
    });

    let anyPending = false;
    let anyRejected = false;
    let anyApproved = false;

    for (const agg of byType.values()) {
      if (agg.status === 'PENDING') {
        anyPending = true;
      } else if (agg.status === 'REJECTED') {
        anyRejected = true;
      } else if (agg.status === 'APPROVED') {
        anyApproved = true;
      }
    }

    if (anyPending) return 'InValidation';
    if (anyRejected) return 'PendingDocs';
    if (anyApproved) return 'Validated';
    return 'Pending';
  }

  private normalizeChecklistDecision(
    raw: any,
  ): 'APPROVED' | 'REJECTED' | null {
    if (!raw) return null;
    const s = String(raw).toUpperCase();
    if (s === 'APPROVED' || s === 'VALIDATED' || s === 'APPROVE') {
      return 'APPROVED';
    }
    if (s === 'REJECTED' || s === 'REJECT') {
      return 'REJECTED';
    }
    return null;
  }

  private async shouldCompleteReservation(
    reservationId: string,
    tenantId: string,
  ): Promise<boolean> {
    const reservation = await this.prisma.reservation.findFirst({
      where: { id: reservationId, tenantId },
      select: { status: true },
    });

    if (!reservation) return false;
    if (reservation.status !== ReservationStatus.APPROVED) return false;

    //  Docs
    const docs = await this.prisma.document.findMany({
      where: { reservationId },
      select: {
        type: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const docsAggregate = this.aggregateDocsStatusForReservation(
      docs as any[],
    );
    if (docsAggregate !== 'Validated') {
      return false;
    }

    //  Checklists
    const submissions = await this.prisma.checklistSubmission.findMany({
      where: { reservationId },
      select: {
        kind: true,
        payload: true,
        createdAt: true,
      },
    });

    if (!submissions.length) return false;

    const hasUserReturn = submissions.some(
      (s) => s.kind === ChecklistSubmissionKind.USER_RETURN,
    );
    if (!hasUserReturn) return false;

    const validations = submissions.filter(
      (s) => s.kind === ChecklistSubmissionKind.APPROVER_VALIDATION,
    );
    if (!validations.length) return false;

    const latest = validations.reduce((best, curr) => {
      const tb = new Date(best.createdAt).getTime();
      const tc = new Date(curr.createdAt).getTime();
      return tc > tb ? curr : best;
    });

    const payload: any = latest.payload ?? {};

    const decision =
      this.normalizeChecklistDecision(payload.decision) ??
      this.normalizeChecklistDecision(payload.result) ??
      this.normalizeChecklistDecision(payload.status);

    if (decision === 'APPROVED' || decision === 'REJECTED') {
      return true;
    }

    return false;
  }

  private async tryCompleteReservation(
    reservationId: string,
    tenantId: string,
    userId?: string,
  ): Promise<void> {
    const ok = await this.shouldCompleteReservation(reservationId, tenantId);
    if (!ok) return;

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.reservation.update({
        where: { id: reservationId },
        data: { status: ReservationStatus.COMPLETED },
        select: {
          id: true,
          tenantId: true,
          carId: true,
        },
      });

      if (updated.carId) {
        await tx.car.updateMany({
          where: { id: updated.carId },
          data: { status: CarStatus.AVAILABLE },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId: updated.tenantId,
          userId: userId ?? null,
          action: 'reservation.completed',
          entity: 'Reservation',
          entityId: updated.id,
          metadata: {
            via: 'checklist',
          } as any,
        },
      });
    });
  }

  // APPROVER: pendências + histórico

  async listPendingForApprover(actor: AuthUser) {
    if (actor.role !== Role.APPROVER && actor.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Somente aprovadores podem ver checklists pendentes',
      );
    }

    const userId = this.getUserId(actor);

    const reservations = await this.prisma.reservation.findMany({
      where: {
        tenantId: actor.tenantId,
        ...(actor.role === Role.APPROVER ? { approverId: userId } : {}),
        // Garante que só venham reservas que tenham pelo menos um USER_RETURN
        checklists: {
          some: {
            kind: ChecklistSubmissionKind.USER_RETURN,
          },
        },
      },
      include: {
        checklists: true,
        user: true,
        car: true,
      },
      orderBy: [{ startAt: 'desc' }, { createdAt: 'desc' }],
    });

    return reservations.map((r) => {
      const submissions = r.checklists ?? [];

      // Todas as validações do APPROVER para essa reserva
      const validations = submissions.filter(
        (s) => s.kind === ChecklistSubmissionKind.APPROVER_VALIDATION,
      );

      let checklistStatus: 'Pending' | 'Validated' | 'Rejected' = 'Pending';

      if (validations.length) {
        // pega a validação mais recente
        const latest = validations.reduce((best, curr) => {
          const tb = new Date(best.createdAt).getTime();
          const tc = new Date(curr.createdAt).getTime();
          return tc > tb ? curr : best;
        });

        const payload: any = latest.payload ?? {};

        const decision =
          this.normalizeChecklistDecision(payload.decision) ??
          this.normalizeChecklistDecision(payload.result) ??
          this.normalizeChecklistDecision(payload.status);

        if (decision === 'APPROVED') {
          checklistStatus = 'Validated';
        } else if (decision === 'REJECTED') {
          checklistStatus = 'Rejected';
        } else {
          checklistStatus = 'Pending';
        }
      }

      return {
        id: r.id,
        origin: r.origin,
        destination: r.destination,
        startAt: r.startAt,
        endAt: r.endAt,
        status: checklistStatus, // status da VALIDAÇÃO do checklist
        requester: {
          id: r.user.id,
          name: r.user.name,
          email: r.user.email,
        },
        car: r.car
          ? {
              id: r.car.id,
              plate: r.car.plate,
              model: r.car.model,
            }
          : null,
      };
    });
  }
}
