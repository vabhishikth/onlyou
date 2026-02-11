import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

export interface PresignedUrlResponse {
    uploadUrl: string;
    fileUrl: string;
    key: string;
}

@Injectable()
export class UploadService {
    private readonly logger = new Logger(UploadService.name);
    private readonly s3Client: S3Client;
    private readonly bucket: string;
    private readonly region: string;

    constructor(private readonly config: ConfigService) {
        this.region = this.config.get<string>('AWS_S3_REGION') || 'ap-south-1';
        this.bucket = this.config.get<string>('AWS_S3_BUCKET') || 'onlyou-uploads';

        this.s3Client = new S3Client({
            region: this.region,
            credentials: {
                accessKeyId: this.config.get<string>('AWS_ACCESS_KEY_ID') || '',
                secretAccessKey: this.config.get<string>('AWS_SECRET_ACCESS_KEY') || '',
            },
        });

        this.logger.log(`S3 configured for bucket: ${this.bucket} in region: ${this.region}`);
    }

    /**
     * Generate a presigned URL for uploading a file to S3
     * @param userId - The user's ID (for organizing files)
     * @param fileType - The type of file (e.g., 'scalp_top', 'scalp_front')
     * @param contentType - MIME type (e.g., 'image/jpeg')
     */
    async getPresignedUploadUrl(
        userId: string,
        fileType: string,
        contentType: string = 'image/jpeg',
    ): Promise<PresignedUrlResponse> {
        const fileExtension = contentType === 'image/png' ? 'png' : 'jpg';
        const key = `intake-photos/${userId}/${fileType}_${randomUUID()}.${fileExtension}`;

        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            ContentType: contentType,
        });

        // Generate presigned URL valid for 15 minutes
        const uploadUrl = await getSignedUrl(this.s3Client, command, {
            expiresIn: 900, // 15 minutes
        });

        // The public URL where the file will be accessible after upload
        const fileUrl = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;

        this.logger.log(`Generated presigned URL for user ${userId}, type: ${fileType}`);

        return {
            uploadUrl,
            fileUrl,
            key,
        };
    }

    /**
     * Test S3 connectivity by uploading a small test file
     */
    async testS3Upload(): Promise<{ success: boolean; message: string }> {
        const testKey = `intake-photos/test/connectivity-test-${Date.now()}.txt`;
        const testContent = 'S3 connectivity test - ' + new Date().toISOString();

        this.logger.log(`Testing S3 upload to bucket: ${this.bucket}, key: ${testKey}`);
        this.logger.log(`Using credentials: ${this.config.get('AWS_ACCESS_KEY_ID')?.substring(0, 8)}...`);

        try {
            // Try to upload a test file
            const command = new PutObjectCommand({
                Bucket: this.bucket,
                Key: testKey,
                Body: testContent,
                ContentType: 'text/plain',
            });

            await this.s3Client.send(command);
            this.logger.log(`Test file uploaded successfully to ${testKey}`);

            return {
                success: true,
                message: `S3 upload test passed. File uploaded to ${testKey}`,
            };
        } catch (error: unknown) {
            const err = error as { name?: string; message?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
            const errorMessage = err.message || err.Code || 'Unknown error';
            const statusCode = err.$metadata?.httpStatusCode;
            this.logger.error(`S3 test failed: ${errorMessage}`, {
                name: err.name,
                message: err.message,
                code: err.Code,
                statusCode,
            });
            return {
                success: false,
                message: `S3 test failed: ${errorMessage} (status: ${statusCode || 'unknown'})`,
            };
        }
    }
}
