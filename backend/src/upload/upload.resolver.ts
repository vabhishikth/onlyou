import { Resolver, Mutation, Args, ObjectType, Field } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UploadService } from './upload.service';
import { GetPresignedUrlInput, PresignedUrlResponse } from './dto/upload.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';

@ObjectType()
class S3TestResult {
    @Field()
    success: boolean;

    @Field()
    message: string;
}

@Resolver()
export class UploadResolver {
    constructor(private readonly uploadService: UploadService) {}

    @Mutation(() => PresignedUrlResponse)
    @UseGuards(JwtAuthGuard)
    async getPresignedUploadUrl(
        @CurrentUser() user: User,
        @Args('input') input: GetPresignedUrlInput,
    ): Promise<PresignedUrlResponse> {
        return this.uploadService.getPresignedUploadUrl(
            user.id,
            input.fileType,
            input.contentType || 'image/jpeg',
        );
    }

    @Mutation(() => S3TestResult)
    async testS3Connection(): Promise<S3TestResult> {
        return this.uploadService.testS3Upload();
    }
}
