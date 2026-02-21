import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { AIService } from './ai.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [AIService],
  exports: [AIService],
})
export class AIModule {}
