import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerOptions } from './multer.config';
import { AzureBlobService } from './azure-blob.service';
import { Audit } from '../infra/audit/audit.decorator';
import { Roles } from '../auth//decorators/roles.decorator';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';

@ApiTags('Documents')
@Controller('documents')
export class FilesController {
  constructor(private blob: AzureBlobService) {}

  @Post('upload')
  @Roles('REQUESTER', 'APPROVER', 'ADMIN')
  @UseInterceptors(FileInterceptor('file', multerOptions))
  @Audit('DOCUMENT_UPLOAD', 'Document')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  async upload(@UploadedFile() file: Express.Multer.File) {
    const url = await this.blob.uploadLocalFile(file.path, file.filename);
    return { filename: file.filename, url };
  }
}
