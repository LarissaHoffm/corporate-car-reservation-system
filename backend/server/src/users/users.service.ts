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

const isUuid = (v?: string) =>
  !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

const isStrongPassword = (pwd: string) => {
  return (
    typeof pwd === 'string' &&
    pwd.length >= 8 &&
    /[A-Z]/.test(pwd) &&
    /[a-z]/.test(pwd) &&
    /\d/.test(pwd) &&
    /[^A-Za-z0-9]/.test(pwd)
  );
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  //Senha forte (12–16) com maiúscula, minúscula, dígito e símbolo /
  private generateStrongPassword(): string {
    const minLen = 12, maxLen = 16;
    const len = minLen + randomInt(maxLen - minLen + 1);
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnopqrstuvwxyz';
    const digits = '23456789';
    const symbols = '!@#$%^&*()-_=+[]{}<>?';
    const all = upper + lower + digits + symbols;
    const pick = (s: string) => s[randomInt(s.length)];
    const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
    for (let i = chars.length; i < len; i++) chars.push(pick(all));
    for (let i = chars.length - 1; i > 0; i--) { const j = randomInt(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
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

    let mustChangePassword = false;
    let rawPassword = dto.password?.trim();
    if (!rawPassword) { rawPassword = this.generateStrongPassword(); mustChangePassword = true; }
    const passwordHash = await argon2.hash(rawPassword);

    const branchIdToPersist = isUuid(dto.branchId) ? dto.branchId! : null;

    const created = await this.prisma.user.create({
      data: {
        tenantId,
        name: dto.name,
        email,
        branchId: branchIdToPersist,
        role: ((dto as any).role as Role) ?? Role.REQUESTER,
        status: UserStatus.ACTIVE,
        passwordHash,
        mustChangePassword,
      } as any,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        branchId: true,
        mustChangePassword: true,
        createdAt: true,
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

    if (!isStrongPassword(dto.newPassword)) {
      throw new BadRequestException(
        'Senha fraca. Requisitos: mín. 8, 1 maiúscula, 1 minúscula, 1 dígito e 1 símbolo.',
      );
    }

    if (!isAdmin) {
      if (!dto.currentPassword) throw new BadRequestException('Informe a senha atual.');
      const ok = await argon2.verify(target.passwordHash, dto.currentPassword);
      if (!ok) throw new BadRequestException('Senha atual inválida.');
    }

    const newHash = await argon2.hash(dto.newPassword);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { passwordHash: newHash, mustChangePassword: false, passwordChangedAt: new Date() } as any,
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
        passwordChangedAt: null as any,
      } as any,
      select: { id: true },
    });

    return { ok: true, userId: id, temporaryPassword };
  }

  async update(id: string, dto: UpdateUserDto, ctx?: { tenantId?: string }) {
    const tenantId = ctx?.tenantId;
    const current = await this.prisma.user.findFirst({
      where: { id, ...(tenantId ? { tenantId } : {}) }, select: { id: true },
    });
    if (!current) throw new NotFoundException('Usuário não encontrado');

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.branchId !== undefined) data.branchId = isUuid(dto.branchId) ? dto.branchId : null;
    if ((dto as any).phone !== undefined) data.phone = (dto as any).phone;
    if ((dto as any).role !== undefined) data.role = (dto as any).role as Role;
    if ((dto as any).status !== undefined) data.status = (dto as any).status as UserStatus;
    if ((dto as any).email !== undefined) data.email = String((dto as any).email).trim().toLowerCase();

    if ((dto as any).password) {
      const passwordHash = await argon2.hash(String((dto as any).password).trim());
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
        mustChangePassword: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  async findAll(tenantId?: string) {
    return this.prisma.user.findMany({
      where: tenantId ? { tenantId } : undefined,
      select: {
        id: true, email: true, name: true, role: true, status: true,
        branchId: true, tenantId: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const u = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, name: true, role: true, status: true,
        branchId: true, tenantId: true, createdAt: true,
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
      where: { id }, data: { role: Role.APPROVER },
      select: { id: true, email: true, role: true, status: true },
    });
  }

  async revokeApprover(id: string) {
    return this.prisma.user.update({
      where: { id }, data: { role: Role.REQUESTER },
      select: { id: true, email: true, role: true, status: true },
    });
  }
}
