import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { EmployeeDashboardService } from './employee-dashboard.service';

@Controller('employee-dashboard')
export class EmployeeDashboardController {
  constructor(private readonly employeeDashboardService: EmployeeDashboardService) {}

  @Get('overview')
  async getOverview(@Query('employeeId') employeeId?: string, @Query('department') department?: string) {
    if (!employeeId) {
      throw new BadRequestException('employeeId query parameter is required');
    }

    return this.employeeDashboardService.getOverview(String(employeeId), department ? String(department) : undefined);
  }
}

