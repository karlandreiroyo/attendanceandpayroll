import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {   // <-- ✅ Make sure this class is exported
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    try {
      return await this.authService.login(body.username, body.password);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
