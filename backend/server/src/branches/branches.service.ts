import { Injectable } from '@nestjs/common';
import { PrismaService } from '../infra/prisma.service';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  list(tenantId?: string) {
    return this.prisma.branch.findMany({
      where: tenantId ? { tenantId } : undefined,
      select: { id: true, name: true, tenantId: true },
      orderBy: { name: 'asc' },
    });
  }

  getById(id: string, tenantId?: string) {
    return this.prisma.branch.findFirst({
      where: { id, ...(tenantId ? { tenantId } : {}) },
      select: { id: true, name: true, tenantId: true },
    });
  }
}
