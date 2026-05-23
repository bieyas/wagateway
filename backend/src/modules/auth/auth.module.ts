import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from './entities/user.entity';
import { Organization } from './entities/organization.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OrganizationGuard } from './guards/organization.guard';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([User, Organization]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret') ?? 'fallback-secret',
        signOptions: { expiresIn: (config.get<string>('jwt.expiresIn') ?? '7d') as '7d' },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, OrganizationGuard],
  controllers: [AuthController],
  exports: [AuthService, JwtAuthGuard, OrganizationGuard, JwtModule],
})
export class AuthModule {}
