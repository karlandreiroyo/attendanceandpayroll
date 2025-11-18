import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  BadRequestException,
  UsePipes,
  ValidationPipe,
  Query,
} from '@nestjs/common';
import { UsersService, User } from './users.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get()
  async findAll(
    @Query('username') username?: string,
    @Query('includeInactive') includeInactive?: string,
  ): Promise<User | User[]> {
    try {
      if (username) {
        const user = await this.usersService.findByUsername(username);
        if (!user) {
          throw new BadRequestException('User not found');
        }
        return user;
      }
      const includeInactiveFlag = includeInactive === 'true';
      return await this.usersService.findAll(includeInactiveFlag);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post()
  @UsePipes(new ValidationPipe())
  async create(@Body() body: CreateEmployeeDto): Promise<User> {
    try {
      // Set default values
      const employeeData = {
        ...body,
        role: body.role || 'employee',
        status: body.status || 'Active',
        join_date: body.join_date || new Date().toISOString().split('T')[0],
      };
      return await this.usersService.create(employeeData);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Put(':id')
  @UsePipes(new ValidationPipe())
  async update(
    @Param('id') id: string,
    @Body() body: UpdateEmployeeDto,
  ): Promise<User> {
    try {
      return await this.usersService.update(id, body);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    try {
      return await this.usersService.delete(id);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
