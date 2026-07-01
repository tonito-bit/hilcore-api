import { Controller, Post, Get, Body, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public() @Post('register')
  register(@Body() dto: any) { return this.auth.register(dto); }

  @Public() @Post('login') @HttpCode(200)
  login(@Body() dto: any) { return this.auth.login(dto); }

  @UseGuards(JwtAuthGuard) @Get('me') @ApiBearerAuth()
  getMe(@CurrentUser() user: any) { return this.auth.getMe(user.id); }
}
