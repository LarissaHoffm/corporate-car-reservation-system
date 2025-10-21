import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Audit } from '../infra/audit/audit.decorator';
import { StationsService } from './stations.service';
import { CreateStationDto } from './dto/create-station.dto';
import { UpdateStationDto } from './dto/update-station.dto';
import { QueryStationsDto } from './dto/query-stations.dto';

@ApiTags('Stations')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stations')
export class StationsController {
  constructor(private readonly stations: StationsService) {}

  @Post()
  @Roles('APPROVER','ADMIN')
  @Audit('STATION_CREATE','Station')
  create(@Req() req: any, @Body() dto: CreateStationDto) {
    return this.stations.create({ tenantId: req.user.tenantId }, dto);
  }

  @Get()
  @Roles('REQUESTER','APPROVER','ADMIN')
  @ApiQuery({ name: 'branchId', required: false, type: String })
  @ApiQuery({ name: 'q', required: false, type: String, description: 'Busca por nome (contains)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  list(@Req() req: any, @Query() q: QueryStationsDto) {
    return this.stations.list({ tenantId: req.user.tenantId }, q);
  }

  @Get(':id')
  @Roles('REQUESTER','APPROVER','ADMIN')
  get(@Req() req: any, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.stations.get({ tenantId: req.user.tenantId }, id);
  }

  @Patch(':id')
  @Roles('APPROVER','ADMIN')
  @Audit('STATION_UPDATE','Station')
  update(@Req() req: any, @Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateStationDto) {
    return this.stations.update({ tenantId: req.user.tenantId }, id, dto);
  }

  @Delete(':id')
  @Roles('APPROVER','ADMIN')
  @Audit('STATION_DELETE','Station')
  remove(@Req() req: any, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.stations.remove({ tenantId: req.user.tenantId }, id);
  }
}
