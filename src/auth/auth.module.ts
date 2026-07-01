// ============================================================
// AUTH MODULE — JWT + bcrypt + MFA
// ============================================================

// ---------- auth.module.ts ----------
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { User } from '../modules/users/user.entity';

// NOTE: In a real build, each class below lives in its own file.
// They are combined here for clarity and portability.

export { AuthModule };

@Module({
  imports: [
    PassportModule,
    ConfigModule,
    TypeOrmModule.forFeature([User]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'hillcore-secret-change-in-prod'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES', '8h') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
class AuthModule {}


// ============================================================
// ---------- jwt.strategy.ts ----------
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(User) private usersRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'hillcore-secret-change-in-prod'),
    });
  }

  async validate(payload: { sub: string; companyId: string; role: string }) {
    const user = await this.usersRepo.findOne({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException();
    return { id: user.id, companyId: user.companyId, role: user.role, email: user.email };
  }
}


// ============================================================
// ---------- auth.service.ts ----------
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already registered');

    const hash = await bcrypt.hash(dto.password, 12);
    const user = this.usersRepo.create({ ...dto, passwordHash: hash });
    await this.usersRepo.save(user);

    return this.signToken(user);
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (user.mfaEnabled) {
      if (!dto.mfaToken) return { requiresMfa: true };
      const ok = speakeasy.totp.verify({
        secret: user.mfaSecret,
        encoding: 'base32',
        token: dto.mfaToken,
        window: 1,
      });
      if (!ok) throw new UnauthorizedException('Invalid MFA token');
    }

    await this.usersRepo.update(user.id, { lastLoginAt: new Date() });
    return this.signToken(user);
  }

  async enableMfa(userId: string) {
    const secret = speakeasy.generateSecret({ name: 'Hillcore', length: 20 });
    await this.usersRepo.update(userId, { mfaSecret: secret.base32, mfaEnabled: true });
    return { otpauthUrl: secret.otpauth_url, base32: secret.base32 };
  }

  private signToken(user: User) {
    const payload = { sub: user.id, companyId: user.companyId, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }
}


// ============================================================
// ---------- auth.controller.ts ----------
import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsString() name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
  @IsString() companyName: string;
}

export class LoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
  @IsOptional() @IsString() mfaToken?: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register new company + admin user' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login — returns JWT token' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  me(@Request() req) {
    return req.user;
  }

  @Post('mfa/enable')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  enableMfa(@Request() req) {
    return this.authService.enableMfa(req.user.id);
  }
}
