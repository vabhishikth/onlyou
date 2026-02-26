import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
    sub: string;
    phone: string;
    role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        config: ConfigService,
        private readonly prisma: PrismaService,
    ) {
        const secret = config.get<string>('JWT_ACCESS_SECRET');
        if (!secret) {
            throw new Error('JWT_ACCESS_SECRET must be configured');
        }
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: secret,
        });
    }

    // Spec: Section 14 (Security) — validate user status and role on every request
    async validate(payload: JwtPayload) {
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        if (!user.isVerified) {
            throw new UnauthorizedException('Account not verified');
        }

        if (user.role !== payload.role) {
            throw new UnauthorizedException('Token role mismatch');
        }

        return user;
    }
}
