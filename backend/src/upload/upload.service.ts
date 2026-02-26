import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

export interface PresignedUrlResponse {
    uploadUrl: string;
    fileUrl: string;
    key: string;
}

export interface ImageValidationResult {
    valid: boolean;
    message?: string;
}

export interface BlurDetectionResult {
    isBlurry: boolean;
    message?: string;
}

// Spec: master spec Section 14 — Allowed image types for intake photos
const ALLOWED_CONTENT_TYPES = [
    'image/jpeg',
    'image/png',
    'image/heic',
    'image/webp',
];

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
        // Validate content type
        if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
            throw new BadRequestException('Unsupported file type');
        }

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
     * Generate a presigned URL for reading a private S3 object.
     * Extracts the S3 key from a stored URL or accepts a key directly.
     * Returns a 1-hour presigned read URL.
     */
    async getPresignedReadUrl(urlOrKey: string): Promise<string> {
        // Extract key from full S3 URL if needed
        const prefix = `https://${this.bucket}.s3.${this.region}.amazonaws.com/`;
        const key = urlOrKey.startsWith('http') ? urlOrKey.replace(prefix, '') : urlOrKey;

        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
        });

        return getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
    }

    // Spec: master spec Section 14 — Image resolution validation
    // Minimum 800x600 resolution required for medical photos
    validateImageResolution(width: number, height: number): ImageValidationResult {
        const MIN_WIDTH = 800;
        const MIN_HEIGHT = 600;

        if (width < MIN_WIDTH || height < MIN_HEIGHT) {
            return {
                valid: false,
                message: 'Image resolution too low. Minimum 800x600 required.',
            };
        }

        return { valid: true };
    }

    // Spec: master spec Section 14 — Blur detection using Laplacian variance
    // laplacianVariance is calculated client-side or server-side using image processing
    // Sharp images have variance > 100, blurry images have < 100
    detectBlur(laplacianVariance: number): BlurDetectionResult {
        const BLUR_THRESHOLD = 100;

        if (laplacianVariance < BLUR_THRESHOLD) {
            return {
                isBlurry: true,
                message: 'Image appears blurry. Please take a clearer photo.',
            };
        }

        return { isBlurry: false };
    }

    // Spec: master spec Section 14 — Brightness validation
    // Average pixel brightness should be between 50-200 (on 0-255 scale)
    validateBrightness(averageBrightness: number): ImageValidationResult {
        const MIN_BRIGHTNESS = 50;
        const MAX_BRIGHTNESS = 200;

        if (averageBrightness < MIN_BRIGHTNESS) {
            return {
                valid: false,
                message: 'Image is too dark. Please take photo in better lighting.',
            };
        }

        if (averageBrightness > MAX_BRIGHTNESS) {
            return {
                valid: false,
                message: 'Image is overexposed. Please reduce lighting or avoid direct light.',
            };
        }

        return { valid: true };
    }

    /**
     * Upload a buffer directly to S3
     * Used for server-generated files (PDFs, reports)
     * Spec: master spec Section 5.4 — PDF generated and stored
     */
    async uploadBuffer(
        key: string,
        buffer: Buffer,
        contentType: string,
    ): Promise<string> {
        try {
            const command = new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: buffer,
                ContentType: contentType,
            });
            await this.s3Client.send(command);
            const fileUrl = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
            this.logger.log(`Uploaded file to S3: ${key}`);
            return fileUrl;
        } catch (error) {
            this.logger.error(`Failed to upload to S3: ${(error as Error).message}`);
            throw new Error('Failed to upload file to S3');
        }
    }

    /**
     * Test S3 connectivity by uploading a small test file
     */
    async testS3Upload(): Promise<{ success: boolean; message: string }> {
        const testKey = `intake-photos/test/connectivity-test-${Date.now()}.txt`;
        const testContent = 'S3 connectivity test - ' + new Date().toISOString();

        this.logger.log(`Testing S3 upload to bucket: ${this.bucket}, key: ${testKey}`);
        // Only log partial credentials in non-production environments
        if (this.config.get('NODE_ENV') !== 'production') {
            this.logger.log(`Using credentials: ${this.config.get('AWS_ACCESS_KEY_ID')?.substring(0, 8)}...`);
        }

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
