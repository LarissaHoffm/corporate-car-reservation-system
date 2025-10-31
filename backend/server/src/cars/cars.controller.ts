import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CarsService } from './cars.service';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';
import { ListCarsQueryDto } from './dto/list-cars.query';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Cars')
// 👇 use o MESMO nome do esquema definido no main.ts: 'access-token'
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cars')
export class CarsController {
  constructor(private readonly cars: CarsService) {}

  // Listagem: ADMIN e APPROVER
  @Roles('ADMIN', 'APPROVER')
  @Get()
  async list(@Req() req: any, @Query() query: ListCarsQueryDto) {
    const tenantId = req.user?.tenantId as string;
    return this.cars.list(tenantId, query);
  }

  // Detalhe: ADMIN e APPROVER
  @Roles('ADMIN', 'APPROVER')
  @Get(':id')
  async get(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.user?.tenantId as string;
    return this.cars.getById(tenantId, id);
  }

  // Criar: ADMIN e APPROVER
  @Roles('ADMIN', 'APPROVER')
  @Post()
  async create(@Req() req: any, @Body() dto: CreateCarDto) {
    const tenantId = req.user?.tenantId as string;
    return this.cars.create(tenantId, dto);
  }

  // Atualizar: ADMIN e APPROVER
  @Roles('ADMIN', 'APPROVER')
  @Patch(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateCarDto) {
    const tenantId = req.user?.tenantId as string;
    return this.cars.update(tenantId, id, dto);
  }

  // Remover: ADMIN e APPROVER
  @Roles('ADMIN', 'APPROVER')
  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.user?.tenantId as string;
    return this.cars.remove(tenantId, id);
  }
}
