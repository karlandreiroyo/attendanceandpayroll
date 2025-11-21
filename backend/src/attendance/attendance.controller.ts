import { Controller, Get, Post, Body, Query, BadRequestException } from '@nestjs/common';
import { AttendanceService } from './attendance.service';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('record')
  async recordAttendance(@Body() body: { fingerprintId: number }) {
    if (!body || typeof body.fingerprintId !== 'number') {
      throw new BadRequestException('fingerprintId is required and must be a number');
    }

    return this.attendanceService.recordAttendance(body.fingerprintId);
  }

  @Get('records')
  async getAttendance(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('userId') userId?: string,
    @Query('department') department?: string,
  ) {
    return this.attendanceService.getAttendance({
      startDate,
      endDate,
      userId,
      department,
    });
  }

  @Get('summary')
  async getAttendanceSummary(
    @Query('date') date?: string,
    @Query('department') department?: string,
  ) {
    if (!date) {
      throw new BadRequestException('date query parameter is required');
    }

    return this.attendanceService.getAttendanceSummary(date, department);
  }

  @Get('check-foreign-key')
  async checkForeignKey(@Query('employeeId') employeeId?: string) {
    // Diagnostic endpoint to check foreign key relationship
    if (!employeeId) {
      return {
        message: 'Please provide employeeId query parameter',
        example: '/attendance/check-foreign-key?employeeId=7f8a1741-d44a-4157-8206-c9302f828da9',
      };
    }

    const result: any = {
      employeeId,
      checks: {},
    };

    // Check if exists in users by user_id
    const { data: userByUserId, error: userByIdError } =
      await this.attendanceService['supabaseService'].client
        .from('users')
        .select('user_id, id, first_name, last_name')
        .eq('user_id', employeeId)
        .maybeSingle();

    result.checks.by_user_id = {
      exists: !!userByUserId,
      data: userByUserId || null,
      error: userByIdError?.message || null,
    };

    // Check if exists in users by id
    const { data: userById, error: userByIdError2 } =
      await this.attendanceService['supabaseService'].client
        .from('users')
        .select('user_id, id, first_name, last_name')
        .eq('id', employeeId)
        .maybeSingle();

    result.checks.by_id = {
      exists: !!userById,
      data: userById || null,
      error: userByIdError2?.message || null,
    };

    // Recommendation
    if (userById && !userByUserId) {
      result.recommendation = 'Foreign key likely references users.id. Use users.id for employee_id.';
      result.correctId = userById.id;
    } else if (userByUserId && !userById) {
      result.recommendation = 'Foreign key likely references users.user_id. Use users.user_id for employee_id.';
      result.correctId = userByUserId.user_id;
    } else if (userById && userByUserId) {
      result.recommendation = 'Both columns exist. Foreign key likely references users.id (primary key).';
      result.correctId = userById.id;
    } else {
      result.recommendation = 'Employee ID not found in users table. Employee does not exist.';
      result.correctId = null;
    }

    return result;
  }
}

