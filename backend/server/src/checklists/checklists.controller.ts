import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Delete,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { ChecklistsService } from './checklists.service';
import type { AuthUser } from './checklists.service';
import { CreateChecklistTemplateDto } from './dto/create-checklist-template.dto';
import { UpdateChecklistTemplateDto } from './dto/update-checklist-template.dto';
import { SubmitChecklistDto } from './dto/submit-checklist.dto';
import { Role } from '@prisma/client';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthUser as AuthUserDecorator } from '../auth/decorators/auth-user.decorator';

@ApiTags('Checklists')
@ApiBearerAuth('access-token')
@Controller('checklists')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChecklistsController {
  constructor(private readonly service: ChecklistsService) {}

  // ADMIN

  @Post('templates')
  @Roles(Role.ADMIN)
  createTemplate(
    @AuthUserDecorator() user: AuthUser,
    @Body() dto: CreateChecklistTemplateDto,
  ) {
    return this.service.createTemplate(user, dto);
  }

  @Get('templates')
  listTemplates(
    @AuthUserDecorator() user: AuthUser,
    @Query('onlyActive') onlyActive?: string,
    @Query('carId') carId?: string,
  ) {
    const flag = onlyActive !== 'false'; // default true
    return this.service.listTemplates(user, flag, carId);
  }

  @Put('templates/:id')
  @Roles(Role.ADMIN)
  updateTemplate(
    @AuthUserDecorator() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateChecklistTemplateDto,
  ) {
    return this.service.updateTemplate(user, id, dto);
  }

  @Patch('templates/:id/status')
  @Roles(Role.ADMIN)
  setTemplateActive(
    @AuthUserDecorator() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('active') active: string,
  ) {
    const flag = active !== 'false';
    return this.service.setTemplateActive(user, id, flag);
  }

  // SUBMISSÕES 

  @Post('reservations/:reservationId/submissions')
  submitChecklist(
    @AuthUserDecorator() user: AuthUser,
    @Param('reservationId', new ParseUUIDPipe()) reservationId: string,
    @Body() dto: SubmitChecklistDto,
  ) {
    return this.service.submitChecklist(user, reservationId, dto);
  }

  @Get('reservations/:reservationId/submissions')
  getReservationChecklists(
    @AuthUserDecorator() user: AuthUser,
    @Param('reservationId', new ParseUUIDPipe()) reservationId: string,
  ) {
    return this.service.getReservationChecklists(user, reservationId);
  }

  // NOVA ROTA
  @Get('reservations/:reservationId/template')
  getTemplateForReservation(
    @AuthUserDecorator() user: AuthUser,
    @Param('reservationId', new ParseUUIDPipe()) reservationId: string,
  ) {
    return this.service.getTemplateForReservation(user, reservationId);
  }

  // APPROVER

  @Get('pending')
  @Roles(Role.APPROVER, Role.ADMIN)
  listPendingForApprover(@AuthUserDecorator() user: AuthUser) {
    return this.service.listPendingForApprover(user);
  }

  // ADMIN

  @Delete('templates/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Remove definitivamente um template de checklist (somente ADMIN).',
  })
  @ApiOkResponse({
    description: 'Template removido com sucesso.',
    schema: {
      example: { id: 'uuid-do-template', deleted: true },
    },
  })
  @ApiNotFoundResponse({ description: 'Template não encontrado.' })
  @ApiConflictResponse({
    description:
      'Não é possível excluir um checklist que já foi usado em reservas.',
  })
  deleteTemplate(
    @AuthUserDecorator() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.deleteTemplate(user, id);
  }
}
