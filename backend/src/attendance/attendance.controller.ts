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
}

