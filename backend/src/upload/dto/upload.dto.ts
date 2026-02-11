import { InputType, Field, ObjectType } from '@nestjs/graphql';
import { IsString, IsOptional } from 'class-validator';

@InputType()
export class GetPresignedUrlInput {
    @Field()
    @IsString()
    fileType: string; // e.g., 'scalp_top', 'scalp_front', 'scalp_left', 'scalp_right'

    @Field({ nullable: true, defaultValue: 'image/jpeg' })
    @IsOptional()
    @IsString()
    contentType?: string;
}

@ObjectType()
export class PresignedUrlResponse {
    @Field()
    uploadUrl: string; // PUT to this URL to upload the file

    @Field()
    fileUrl: string; // The final URL where the file will be accessible

    @Field()
    key: string; // S3 key for reference
}
