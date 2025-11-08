import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { LeaveRequestsService } from './leave-requests.service';
import type { LeaveStatus } from './leave-requests.service';

@Controller('leave-requests')
export class LeaveRequestsController {
  constructor(private readonly leaveRequestsService: LeaveRequestsService) {}

  @Post()
  async create(@Body() body: any) {
    if (!body?.employee_id) {
      throw new BadRequestException('employee_id is required');
    }
    if (!body?.employee_name) {
      throw new BadRequestException('employee_name is required');
    }
    if (!body?.type) {
      throw new BadRequestException('type is required');
    }
    if (!body?.start_date || !body?.end_date) {
      throw new BadRequestException('start_date and end_date are required');
    }

    return this.leaveRequestsService.create({
      employee_id: String(body.employee_id),
      employee_name: String(body.employee_name),
      department: body.department ? String(body.department) : undefined,
      type: String(body.type),
      start_date: String(body.start_date),
      end_date: String(body.end_date),
      reason: body.reason ? String(body.reason) : undefined,
    });
  }

  @Get()
  async findAll(@Query('employeeId') employeeId?: string, @Query('status') status?: LeaveStatus) {
    return this.leaveRequestsService.findAll({
      employeeId: employeeId ? String(employeeId) : undefined,
      status: status ? (status as LeaveStatus) : undefined,
    });
  }

  @Get('balances')
  async getBalances(@Query('employeeId') employeeId?: string) {
    if (!employeeId) {
      throw new BadRequestException('employeeId query parameter is required');
    }
    return this.leaveRequestsService.getBalances(String(employeeId));
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: any) {
    if (!body?.status) {
      throw new BadRequestException('status is required');
    }

    return this.leaveRequestsService.updateStatus(String(id), {
      status: body.status as LeaveStatus,
      admin_note: body.admin_note ? String(body.admin_note) : undefined,
    });
  }
}


