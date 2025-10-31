import { Injectable } from '@nestjs/common';
import { PrismaService } from '../infra/prisma.service';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  list(tenantId?: string) {
    return this.prisma.department.findMany({
      where: tenantId ? { tenantId } : undefined,
      select: { id: true, name: true, code: true, tenantId: true },
      orderBy: { name: 'asc' },
    });
  }

  getById(id: string, tenantId?: string) {
    return this.prisma.department.findFirst({
      where: { id, ...(tenantId ? { tenantId } : {}) },
      select: { id: true, name: true, code: true, tenantId: true },
    });
  }
}
