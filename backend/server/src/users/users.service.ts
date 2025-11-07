import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../infra/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { Role, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomInt } from 'crypto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /** Regras fortes: mín. 8, 1 maiúscula, 1 minúscula, 1 dígito, 1 símbolo */
  private assertStrongPassword(pwd: string) {
    const ok =
      typeof pwd === 'string' &&
      pwd.length >= 8 &&
      /[A-Z]/.test(pwd) &&
      /[a-z]/.test(pwd) &&
      /\d/.test(pwd) &&
      /[^A-Za-z0-9]/.test(pwd);

    if (!ok) {
      throw new BadRequestException(
        'Senha fraca. Requisitos: mín. 8, 1 maiúscula, 1 minúscula, 1 dígito e 1 símbolo.',
      );
    }
  }

  private generateStrongPassword(): string {
    const minLen = 12,
      maxLen = 16;
    const len = minLen + randomInt(maxLen - minLen + 1);
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnopqrstuvwxyz';
    const digits = '23456789';
    const symbols = '!@#$%^&*()-_=+[]{}<>?';
    const all = upper + lower + digits + symbols;
    const pick = (s: string) => s[randomInt(s.length)];
    const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
    for (let i = chars.length; i < len; i++) chars.push(pick(all));
    for (let i = chars.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join('');
  }

  async create(
    dto: CreateUserDto,
    ctx?: { tenantId?: string; actorId?: string } | string,
  ) {
    let tenantId: string | null = null;
    if (ctx && typeof ctx === 'object') tenantId = ctx.tenantId ?? null;
    tenantId = tenantId ?? (dto as any)?.tenantId ?? null;

    if (!tenantId) throw new ConflictException('Tenant ausente na requisição');

    const email = dto.email.trim().toLowerCase();

    const exists = await this.prisma.user.findFirst({
      where: { email, tenantId },
      select: { id: true },
    });
    if (exists) throw new ConflictException('E-mail já cadastrado para este tenant.');

    let branchIdToPersist: string | null = null;
    if (dto.branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: dto.branchId, tenantId },
        select: { id: true },
      });
      if (!branch) {
        throw new BadRequestException('Filial (branchId) inexistente para este tenant.');
      }
      branchIdToPersist = dto.branchId;
    }

    // senha
    let mustChangePassword = false;
    let rawPassword = dto.password?.trim();

    if (!rawPassword) {
      // sem senha informada → gera temporária forte e força troca
      rawPassword = this.generateStrongPassword();
      mustChangePassword = true;
    } else {
      // senha informada → valida política
      this.assertStrongPassword(rawPassword);
    }
    const passwordHash = await argon2.hash(rawPassword);

    const rawPhone = (dto as any).phone as string | undefined;
    const normalizedPhone =
      rawPhone && rawPhone.trim() !== '' ? rawPhone.replace(/\D/g, '') : null;

    const created = await this.prisma.user.create({
      data: {
        tenantId,
        name: dto.name,
        email,
        branchId: branchIdToPersist,
        department: dto.department ?? null,
        role: ((dto as any).role as Role) ?? Role.REQUESTER,
        status: UserStatus.ACTIVE,
        passwordHash,
        mustChangePassword,
        passwordChangedAt: mustChangePassword ? null : new Date(),
        phone: normalizedPhone,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        branchId: true,
        department: true,
        mustChangePassword: true,
        createdAt: true,
        phone: true,
      },
    });

    return {
      ...created,
      temporaryPassword: mustChangePassword ? rawPassword : undefined,
    };
  }

  async updatePassword(
    id: string,
    dto: UpdatePasswordDto,
    ctx?: { tenantId?: string; actorId?: string; actorRole?: Role },
  ) {
    if (!dto || typeof dto !== 'object') {
      throw new BadRequestException('Body obrigatório.');
    }
    if (!dto.newPassword) {
      throw new BadRequestException('Campo "newPassword" é obrigatório.');
    }
    this.assertStrongPassword(dto.newPassword);

    const tenantId = ctx?.tenantId ?? null;
    const actorId = ctx?.actorId ?? null;
    const actorRole = ctx?.actorRole ?? null;

    const target = await this.prisma.user.findFirst({
      where: { id, ...(tenantId ? { tenantId } : {}) },
      select: { id: true, tenantId: true, passwordHash: true, mustChangePassword: true },
    });
    if (!target) throw new NotFoundException('Usuário não encontrado');

    const isAdmin = String(actorRole) === 'ADMIN';
    const isSelf = actorId === id;

    if (!isAdmin && !isSelf) {
      throw new ForbiddenException('Sem permissão para alterar a senha deste usuário.');
    }

    if (!isAdmin) {
      if (!target.mustChangePassword) {
        if (!dto.currentPassword) throw new BadRequestException('Informe a senha atual.');
        const ok = await argon2.verify(target.passwordHash, dto.currentPassword);
        if (!ok) throw new BadRequestException('Senha atual inválida.');
      }
    }

    const newHash = await argon2.hash(dto.newPassword);
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      },
      select: { id: true },
    });

    return {
      ok: true,
      userId: updated.id,
      mustChangePassword: false,
      passwordChangedAt: new Date().toISOString(),
    };
  }

  async resetPassword(
    id: string,
    ctx?: { tenantId?: string; actorId?: string; actorRole?: Role },
  ) {
    const tenantId = ctx?.tenantId ?? null;
    const actorRole = ctx?.actorRole ?? null;

    if (String(actorRole) !== 'ADMIN') {
      throw new ForbiddenException('Apenas ADMIN pode resetar senha.');
    }

    const target = await this.prisma.user.findFirst({
      where: { id, ...(tenantId ? { tenantId } : {}) },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('Usuário não encontrado');

    const temporaryPassword = this.generateStrongPassword();
    const passwordHash = await argon2.hash(temporaryPassword);

    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        mustChangePassword: true,
        passwordChangedAt: null,
      },
      select: { id: true },
    });

    return { ok: true, userId: id, temporaryPassword };
  }

  async update(id: string, dto: UpdateUserDto, ctx?: { tenantId?: string }) {
    const tenantId = ctx?.tenantId ?? undefined;

    const current = await this.prisma.user.findFirst({
      where: { id, ...(tenantId ? { tenantId } : {}) },
      select: { id: true, tenantId: true },
    });
    if (!current) throw new NotFoundException('Usuário não encontrado');

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;

    if (dto.branchId !== undefined) {
      if (dto.branchId === null) {
        data.branchId = null;
      } else {
        const branch = await this.prisma.branch.findFirst({
          where: { id: dto.branchId, tenantId: current.tenantId },
          select: { id: true },
        });
        if (!branch) throw new BadRequestException('Filial (branchId) inexistente para este tenant.');
        data.branchId = dto.branchId;
      }
    }

    if ((dto as any).phone !== undefined) {
      const rp = String((dto as any).phone ?? '').trim();
      data.phone = rp === '' ? null : rp.replace(/\D/g, '');
    }

    if ((dto as any).role !== undefined) data.role = (dto as any).role as Role;
    if ((dto as any).status !== undefined) data.status = (dto as any).status as UserStatus;
    if ((dto as any).email !== undefined)
      data.email = String((dto as any).email).trim().toLowerCase();
    if (dto.department !== undefined) data.department = dto.department ?? null;

    // ADMIN definindo nova senha direto no update
    if ((dto as any).password) {
      const raw = String((dto as any).password).trim();
      this.assertStrongPassword(raw);
      const passwordHash = await argon2.hash(raw);
      data.passwordHash = passwordHash;
      data.mustChangePassword = false;
      data.passwordChangedAt = new Date();
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        branchId: true,
        department: true,
        mustChangePassword: true,
        updatedAt: true,
        phone: true,
      },
    });

    return updated;
  }

  async findAll(tenantId?: string) {
    return this.prisma.user.findMany({
      where: tenantId ? { tenantId } : undefined,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        branchId: true,
        department: true,
        tenantId: true,
        createdAt: true,
        phone: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    }

  async findOne(id: string, ctx?: { tenantId?: string }) {
    const u = await this.prisma.user.findFirst({
      where: { id, ...(ctx?.tenantId ? { tenantId: ctx.tenantId } : {}) },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        department: true,
        branch: { select: { id: true, name: true } },
        tenantId: true,
        createdAt: true,
        updatedAt: true,
        phone: true,
      },
    });
    if (!u) throw new NotFoundException('Usuário não encontrado');
    return u;
  }

  async remove(id: string) {
    await this.prisma.user.delete({ where: { id } });
    return { ok: true };
  }

  async makeApprover(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { role: Role.APPROVER },
      select: { id: true, email: true, role: true, status: true },
    });
  }

  async revokeApprover(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { role: Role.REQUESTER },
      select: { id: true, email: true, role: true, status: true },
    });
  }

  async findReservationsByUser(userId: string, ctx?: { tenantId?: string }) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, ...(ctx?.tenantId ? { tenantId: ctx.tenantId } : {}) },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const reservations = await this.prisma.reservation.findMany({
      where: { userId, ...(ctx?.tenantId ? { tenantId: ctx.tenantId } : {}) },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return reservations;
  }
}
