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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ApproveReservationDto } from './dto/approve-reservation.dto';
import { CancelReservationDto } from './dto/cancel-reservation.dto';
import { QueryReservationsDto } from './dto/query-reservations.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Audit } from '../infra/audit/audit.decorator';

@ApiTags('Reservations')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) { }

  @Post()
  @Roles('REQUESTER', 'APPROVER', 'ADMIN')
  @Audit('RESERVATION_CREATE', 'Reservation')
  create(@Req() req: any, @Body() dto: CreateReservationDto) {
    return this.reservations.create(
      {
        userId: req.user.id,
        tenantId: req.user.tenantId,
        branchId: req.user.branchId,
        role: req.user.role,
      },
      dto,
    );
  }

  @Get('me')
  @Roles('REQUESTER', 'APPROVER', 'ADMIN')
  listMine(@Req() req: any, @Query() q: QueryReservationsDto) {
    return this.reservations.list(
      { tenantId: req.user.tenantId, role: 'REQUESTER', userId: req.user.id },
      q,
    );
  }

  @Get()
  @Roles('REQUESTER', 'APPROVER', 'ADMIN')
  list(@Req() req: any, @Query() q: QueryReservationsDto) {
    return this.reservations.list(
      { tenantId: req.user.tenantId, role: req.user.role, userId: req.user.id },
      q,
    );
  }

  @Patch(':id/approve')
  @Roles('APPROVER', 'ADMIN')
  @Audit('RESERVATION_APPROVE', 'Reservation')
  approve(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ApproveReservationDto,
    @Req() req: any,
  ) {
    return this.reservations.approve(
      { userId: req.user.id, tenantId: req.user.tenantId, role: req.user.role },
      id,
      dto,
    );
  }

  @Patch(':id/cancel')
  @Roles('REQUESTER', 'APPROVER', 'ADMIN')
  @Audit('RESERVATION_CANCEL', 'Reservation')
  cancel(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CancelReservationDto,
    @Req() req: any,
  ) {
    return this.reservations.cancel(
      { userId: req.user.id, tenantId: req.user.tenantId, role: req.user.role },
      id,
      dto,
    );
  }

  @Delete(':id')
  @Roles('ADMIN')
  @Audit('RESERVATION_DELETE', 'Reservation')
  remove(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: any) {
    return this.reservations.remove(
      { userId: req.user.id, tenantId: req.user.tenantId, role: req.user.role },
      id,
    );
  }

  @Get(':id')
  @Roles('REQUESTER', 'APPROVER', 'ADMIN')
  get(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: any) {
    return this.reservations.get(
      { tenantId: req.user.tenantId, role: req.user.role, userId: req.user.id },
      id,
    );
  }
}
