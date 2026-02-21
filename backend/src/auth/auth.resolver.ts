import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { RateLimit } from '../common/decorators/rate-limit.decorator';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import {
    RequestOtpInput,
    VerifyOtpInput,
    RefreshTokenInput,
    RequestOtpResponse,
    AuthResponse,
    UserType,
} from './dto/auth.dto';

import { UserService } from '../user/user.service';

@Resolver()
export class AuthResolver {
    constructor(
        private readonly authService: AuthService,
        private readonly userService: UserService,
    ) { }

    @Mutation(() => RequestOtpResponse)
    @RateLimit(5, 60)
    async requestOtp(@Args('input') input: RequestOtpInput): Promise<RequestOtpResponse> {
        const result = await this.authService.requestOtp(input.phone);
        return result;
    }

    @Mutation(() => AuthResponse)
    @RateLimit(10, 60)
    async verifyOtp(@Args('input') input: VerifyOtpInput): Promise<AuthResponse> {
        const result = await this.authService.verifyOtpAndLogin(input.phone, input.otp);
        const response: AuthResponse = {
            success: result.success,
            message: result.message,
        };
        if (result.user) {
            response.user = await this.mapUser(result.user);
        }
        if (result.tokens) {
            response.accessToken = result.tokens.accessToken;
            response.refreshToken = result.tokens.refreshToken;
        }
        return response;
    }

    @Mutation(() => AuthResponse)
    async refreshToken(@Args('input') input: RefreshTokenInput): Promise<AuthResponse> {
        const result = await this.authService.refreshAccessToken(input.refreshToken);
        const response: AuthResponse = {
            success: result.success,
            message: result.message,
        };
        if (result.user) {
            response.user = await this.mapUser(result.user);
        }
        if (result.tokens) {
            response.accessToken = result.tokens.accessToken;
            response.refreshToken = result.tokens.refreshToken;
        }
        return response;
    }

    @Mutation(() => RequestOtpResponse)
    @UseGuards(JwtAuthGuard)
    async logout(
        @CurrentUser() user: { userId: string },
        @Args('refreshToken', { nullable: true }) refreshToken?: string,
    ): Promise<RequestOtpResponse> {
        await this.authService.logout(user.userId, refreshToken);
        return { success: true, message: 'Logged out successfully' };
    }

    @Query(() => UserType, { nullable: true })
    @UseGuards(JwtAuthGuard)
    async me(@CurrentUser() user: { userId: string }): Promise<UserType | null> {
        const dbUser = await this.authService.getUserById(user.userId);
        return dbUser ? this.mapUser(dbUser) : null;
    }

    private async mapUser(user: {
        id: string;
        phone: string;
        email: string | null;
        name: string | null;
        role: string;
        isVerified: boolean;
        createdAt: Date;
    }): Promise<UserType> {
        const isProfileComplete = await this.userService.isProfileComplete(user.id);
        return {
            id: user.id,
            phone: user.phone,
            email: user.email,
            name: user.name,
            role: user.role,
            isVerified: user.isVerified,
            isProfileComplete,
            createdAt: user.createdAt,
        };
    }
}
