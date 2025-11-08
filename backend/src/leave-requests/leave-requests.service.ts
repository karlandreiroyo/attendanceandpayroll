import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

const LEAVE_TYPE_ALLOWANCES: Record<string, number> = {
  'Vacation': 15,
  'Sick Leave': 10,
  'Personal Leave': 5,
  'Emergency Leave': 3,
};

export interface LeaveRequestRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  department?: string | null;
  type: string;
  start_date: string;
  end_date: string;
  reason?: string | null;
  status: LeaveStatus;
  admin_note?: string | null;
  submitted_at: string;
  updated_at: string;
}

export interface CreateLeaveRequestInput {
  employee_id: string;
  employee_name: string;
  department?: string;
  type: string;
  start_date: string;
  end_date: string;
  reason?: string;
}

export interface GetLeaveRequestsParams {
  employeeId?: string;
  status?: LeaveStatus;
}

export interface UpdateLeaveRequestStatusInput {
  status: LeaveStatus;
  admin_note?: string;
}

@Injectable()
export class LeaveRequestsService {
  private readonly tableName = 'leave_requests';

  constructor(private readonly supabaseService: SupabaseService) {}

  async create(input: CreateLeaveRequestInput): Promise<LeaveRequestRecord> {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const startDate = new Date(input.start_date);
    const endDate = new Date(input.end_date);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid start or end date.');
    }

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    const minStart = new Date(now);
    minStart.setDate(minStart.getDate() + 1);

    if (startDate < minStart) {
      throw new BadRequestException('Start date must be at least one day in advance.');
    }

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after the start date.');
    }

    const { data: existingRequests, error: existingError } = await this.supabaseService.client
      .from(this.tableName)
      .select('*')
      .eq('employee_id', input.employee_id)
      .in('status', ['Pending', 'Approved']);

    if (existingError) {
      throw new BadRequestException(existingError.message);
    }

    const activeRequests = (existingRequests as LeaveRequestRecord[]) ?? [];

    if (activeRequests.length >= 3) {
      throw new BadRequestException('You have reached the maximum number of active leave requests (3).');
    }

    const overlaps = activeRequests.some((request) => {
      const requestStart = new Date(request.start_date);
      const requestEnd = new Date(request.end_date);
      requestStart.setHours(0, 0, 0, 0);
      requestEnd.setHours(0, 0, 0, 0);

      return requestEnd >= startDate && endDate >= requestStart;
    });

    if (overlaps) {
      throw new BadRequestException('Selected dates overlap with an existing leave request.');
    }

    const payload = {
      employee_id: input.employee_id,
      employee_name: input.employee_name,
      department: input.department ?? null,
      type: input.type,
      start_date: input.start_date,
      end_date: input.end_date,
      reason: input.reason ?? null,
      status: 'Pending' as LeaveStatus,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabaseService.client
      .from(this.tableName)
      .insert([payload])
      .select('*')
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data as LeaveRequestRecord;
  }

  async findAll(options: GetLeaveRequestsParams = {}): Promise<LeaveRequestRecord[]> {
    let query = this.supabaseService.client
      .from(this.tableName)
      .select('*')
      .order('submitted_at', { ascending: false });

    if (options.employeeId) {
      query = query.eq('employee_id', options.employeeId);
    }

    if (options.status) {
      query = query.eq('status', options.status);
    }

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(error.message);
    }

    return (data as LeaveRequestRecord[]) ?? [];
  }

  async updateStatus(id: string, input: UpdateLeaveRequestStatusInput): Promise<LeaveRequestRecord> {
    const payload = {
      status: input.status,
      admin_note: input.admin_note ?? null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabaseService.client
      .from(this.tableName)
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data) {
      throw new BadRequestException('Leave request not found');
    }

    return data as LeaveRequestRecord;
  }

  async getBalances(employeeId: string): Promise<Array<{ type: string; allocated: number; used: number; remaining: number }>> {
    const { data, error } = await this.supabaseService.client
      .from(this.tableName)
      .select('type,start_date,end_date')
      .eq('employee_id', employeeId)
      .eq('status', 'Approved');

    if (error) {
      throw new BadRequestException(error.message);
    }

    const usageTotals: Record<string, number> = {};
    const approvedRequests = (data as Array<{ type: string; start_date: string; end_date: string }>) ?? [];

    approvedRequests.forEach((request) => {
      const days = this.calculateDuration(request.start_date, request.end_date);
      usageTotals[request.type] = (usageTotals[request.type] ?? 0) + days;
    });

    const types = new Set<string>([
      ...Object.keys(LEAVE_TYPE_ALLOWANCES),
      ...Object.keys(usageTotals),
    ]);

    return Array.from(types).map((type) => {
      const allocated = LEAVE_TYPE_ALLOWANCES[type] ?? 0;
      const used = usageTotals[type] ?? 0;
      return {
        type,
        allocated,
        used,
        remaining: Math.max(0, allocated - used),
      };
    });
  }

  private calculateDuration(start: string, end: string): number {
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return 0;
    }
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    const diff = endDate.getTime() - startDate.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
    return days > 0 ? days : 0;
  }
}


