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
import { BranchesService } from './branches.service';

@Controller('branches')
@UseGuards(AuthGuard('jwt'))
export class BranchesController {
  constructor(private readonly service: BranchesService) {}

  // GET /branches?tenantId=...
  @Get()
  async list(@Req() req: any, @Query('tenantId') tenantId?: string) {
    const tId = (req?.user?.tenantId as string) || tenantId || undefined;
    return this.service.list(tId);
  }

  // GET /branches/:id
  @Get(':id')
  async byId(
    @Req() req: any,
    @Param('id') id: string,
    @Query('tenantId') tenantId?: string,
  ) {
    const tId = (req?.user?.tenantId as string) || tenantId || undefined;
    const b = await this.service.getById(id, tId);
    if (!b) throw new NotFoundException('Branch not found');
    return b;
  }
}
