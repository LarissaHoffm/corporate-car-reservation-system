import { Module } from '@nestjs/common';
import { AzureBlobService } from './azure-blob.service';
import { FilesController } from './files.controller';

@Module({ providers: [AzureBlobService], controllers: [FilesController] })
export class FilesModule {}
