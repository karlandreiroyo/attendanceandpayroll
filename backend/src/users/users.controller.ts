import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { UsersService, User } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get()
  async findAll(): Promise<User[]> {
    try {
      return await this.usersService.findAll();
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post()
  async create(
    @Body() body: { username: string; password: string; role: string },
  ): Promise<User> {
    try {
      return await this.usersService.create(body);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { username?: string; password?: string; role?: string },
  ): Promise<User> {
    try {
      return await this.usersService.update(Number(id), body);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    try {
      return await this.usersService.delete(Number(id));
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
