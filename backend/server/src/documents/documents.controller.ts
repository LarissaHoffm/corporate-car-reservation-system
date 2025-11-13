import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Audit } from '../infra/audit/audit.decorator';

import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { ValidateDocumentDto } from './dto/validate-document.dto';

@ApiTags('Documents')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class DocumentsController {
  constructor(private readonly docs: DocumentsService) {}

  @Post('reservations/:id/documents')
  @Roles('REQUESTER', 'APPROVER', 'ADMIN')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        type: {
          type: 'string',
          enum: ['CNH', 'RECEIPT', 'ODOMETER_PHOTO', 'OTHER'],
        },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @Audit('DOCUMENT_UPLOAD', 'Document')
  async uploadForReservation(
    @Param('id', new ParseUUIDPipe()) reservationId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
    @Req() req: any,
  ) {
    return this.docs.uploadToReservation({
      reservationId,
      actor: {
        userId: req.user.id,
        role: req.user.role,
        tenantId: req.user.tenantId,
        branchId: req.user.branchId,
      },
      file: {
        buffer: file.buffer,
        mimetype: file.mimetype,
        originalname: file.originalname,
      },
      dto,
    });
  }

  @Get('reservations/:id/documents')
  @Roles('REQUESTER', 'APPROVER', 'ADMIN')
  async listForReservation(
    @Param('id', new ParseUUIDPipe()) reservationId: string,
    @Req() req: any,
  ) {
    return this.docs.listByReservation(
      { userId: req.user.id, role: req.user.role, tenantId: req.user.tenantId },
      reservationId,
    );
  }

  @Get('documents/:id')
  @Roles('REQUESTER', 'APPROVER', 'ADMIN')
  async get(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: any) {
    return this.docs.get(
      { userId: req.user.id, role: req.user.role, tenantId: req.user.tenantId },
      id,
    );
  }

  @Get('documents/:id/file')
  @Roles('REQUESTER', 'APPROVER', 'ADMIN')
  async file(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: any,
    @Res() res: any,
  ) {
    const got = await this.docs.getFile(
      { userId: req.user.id, role: req.user.role, tenantId: req.user.tenantId },
      id,
    );
    res.setHeader('Content-Type', got.mimetype);
    res.setHeader('Content-Disposition', `inline; filename="${got.filename}"`);
    return res.send(got.bin);
  }

  @Patch('documents/:id/validate')
  @Roles('APPROVER', 'ADMIN')
  @Audit('DOCUMENT_VALIDATE', 'Document')
  async validate(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ValidateDocumentDto,
    @Req() req: any,
  ) {
    return this.docs.validateDocument(id, dto, {
      userId: req.user.id,
      tenantId: req.user.tenantId,
      role: req.user.role,
    });
  }
}
