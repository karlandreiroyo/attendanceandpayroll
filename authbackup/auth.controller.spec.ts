import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  async login(@Body() body: any) {
    console.log('🟡 Received login request:', body);
    return this.authService.login(body.username, body.password, body.role);
  }
}
