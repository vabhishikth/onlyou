import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthResolver } from './auth.resolver';
import { OtpService } from './otp.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserModule } from '../user/user.module';

@Module({
    imports: [
        UserModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                const secret = config.get<string>('JWT_ACCESS_SECRET');
                if (!secret) {
                    throw new Error('JWT_ACCESS_SECRET must be configured');
                }
                return {
                    secret,
                    signOptions: { expiresIn: '15m' },
                };
            },
        }),
    ],
    providers: [AuthService, AuthResolver, OtpService, JwtStrategy],
    exports: [AuthService],
})
export class AuthModule { }
