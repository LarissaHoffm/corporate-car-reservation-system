import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DepartmentsService } from './departments.service';

@Controller('departments')
@UseGuards(AuthGuard('jwt'))
export class DepartmentsController {
  constructor(private readonly service: DepartmentsService) {}

  @Get()
  async list(@Req() req: any, @Query('tenantId') tenantId?: string) {
    const tId = (req?.user?.tenantId as string) || tenantId || undefined;
    return this.service.list(tId);
  }

  @Get(':id')
  async byId(
    @Req() req: any,
    @Param('id') id: string,
    @Query('tenantId') tenantId?: string,
  ) {
    const tId = (req?.user?.tenantId as string) || tenantId || undefined;
    const dep = await this.service.getById(id, tId);
    if (!dep) throw new NotFoundException('Department not found');
    return dep;
  }
}
