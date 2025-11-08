import { BadRequestException, Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import type { SavePayrollDto } from './payroll.service';

@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get()
  async getPayroll(@Query('year') year?: string, @Query('month') month?: string) {
    if (!year || !month) {
      throw new BadRequestException('year and month query parameters are required');
    }

    const yearNum = Number(year);
    const monthNum = Number(month);

    if (Number.isNaN(yearNum) || Number.isNaN(monthNum)) {
      throw new BadRequestException('year and month must be numeric values');
    }

    return this.payrollService.getPayroll(yearNum, monthNum);
  }

  @Post()
  async savePayroll(@Body() body: SavePayrollDto) {
    return this.payrollService.savePayroll(body);
  }

  @Get('employee/:userId')
  async getEmployeePayslips(@Param('userId') userId: string) {
    return this.payrollService.getEmployeeHistory(userId);
  }
}
