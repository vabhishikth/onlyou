import { Module } from '@nestjs/common';
import { PhotoRequirementsService } from './photo-requirements.service';

@Module({
  providers: [PhotoRequirementsService],
  exports: [PhotoRequirementsService],
})
export class PhotoModule {}
