import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CarsService } from './cars.service';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Audit } from '../audit/audit.decorator';

@ApiTags('Cars')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cars')
export class CarsController {
  constructor(private readonly cars: CarsService) {}

  @Get()
  @ApiQuery({ name: 'branchId', required: false, type: String })
  async list(@Req() req: any, @Query('branchId') branchId?: string) {
    return this.cars.list(req.user.tenantId, branchId);
  }

  @Get(':id')
  async getById(@Req() req: any, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.cars.getById(req.user.tenantId, id);
  }

  @Post()
  @Roles('ADMIN', 'APPROVER')
  @Audit('CAR_CREATE', 'Car')
  async create(@Req() req: any, @Body() dto: CreateCarDto) {
    return this.cars.create(req.user.tenantId, dto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'APPROVER')
  @Audit('CAR_UPDATE', 'Car')
  async update(
    @Req() req: any,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCarDto,
  ) {
    return this.cars.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'APPROVER')
  @Audit('CAR_DELETE', 'Car')
  async remove(@Req() req: any, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.cars.remove(req.user.tenantId, id);
  }
}
