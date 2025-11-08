import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('attendance')
  async getAttendanceReport(
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('department') department?: string,
  ) {
    return this.reportsService.getAttendanceSummary({ start, end, department });
  }

  @Get('leave')
  async getLeaveReport(
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('department') department?: string,
  ) {
    return this.reportsService.getLeaveSummary({ start, end, department });
  }

  @Get('payroll')
  async getPayrollReport(
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('department') department?: string,
  ) {
    return this.reportsService.getPayrollSummary({ start, end, department });
  }

  @Get('employees')
  async getEmployeeReport(@Query('department') department?: string) {
    return this.reportsService.getEmployeeList({ department });
  }
}


