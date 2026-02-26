import {
  Controller,
  Post,
  Body,
  Headers,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { HmsService } from './hms.service';

// Spec: Phase 14 — REST endpoint for 100ms webhook events
// 100ms sends webhooks via HTTP POST to a REST URL (not GraphQL).
// HMAC signature verified against the stringified body.
// Requires `rawBody: true` in NestFactory.create() options (see main.ts).

@Controller('webhooks/hms')
export class VideoWebhookController {
  private readonly logger = new Logger(VideoWebhookController.name);

  constructor(private readonly hmsService: HmsService) {}

  @Post()
  async handleWebhook(
    @Body() body: any,
    @Headers('x-100ms-signature') signature: string,
    // Third param only used in unit tests (raw body string pass-through)
    parsedOverride?: any,
  ): Promise<{ success: boolean }> {
    // Validate signature exists
    if (!signature) {
      throw new BadRequestException('Missing webhook signature');
    }

    // Verify HMAC signature against the body
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    const isValid = this.hmsService.verifyWebhookSignature(bodyStr, signature);

    if (!isValid) {
      throw new BadRequestException('Invalid webhook signature');
    }

    // Parse body if it arrives as string
    const payload = typeof body === 'string' ? JSON.parse(body) : body;

    this.logger.log(`100ms webhook received: ${payload?.type || 'unknown'}`);

    // Delegate to HmsService — event type mapping happens inside hmsService.handleWebhook
    await this.hmsService.handleWebhook({
      payload,
      webhookSignature: signature,
    });

    return { success: true };
  }
}
