import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

interface RawEmployee {
  user_id?: string;
  id?: string;
  first_name?: string;
  last_name?: string;
  department?: string;
  position?: string;
  daily_rate?: number;
}

interface RawScheduleEntry {
  user_id: string;
  shift: string;
}

export interface PayrollEntryResponse {
  userId: string;
  name: string;
  position: string;
  department: string;
  dailyRate: number;
  daysWorked: number;
  deductions: number;
  grossPay: number;
  netPay: number;
  remarks?: string | null;
}

export interface PayrollResponse {
  processed: boolean;
  run: {
    id: string;
    notes?: string | null;
    processedBy?: string | null;
    processedAt: string;
  } | null;
  entries: PayrollEntryResponse[];
  summary: {
    totalGross: number;
    totalDeductions: number;
    totalNet: number;
  };
}

export interface EmployeePayslipEntry {
  year: number;
  month: number;
  periodLabel: string;
  processedAt: string | null;
  netPay: number;
  grossPay: number;
  deductions: number;
  dailyRate: number;
  daysWorked: number;
  remarks?: string | null;
  notes?: string | null;
}

export interface SavePayrollEntryDto {
  userId: string;
  daysWorked: number;
  dailyRate: number;
  deductions?: number;
  remarks?: string | null;
}

export interface SavePayrollDto {
  year: number;
  month: number;
  processedBy?: string | null;
  notes?: string | null;
  entries: SavePayrollEntryDto[];
}

@Injectable()
export class PayrollService {
  private readonly runsTable = 'payroll_runs';
  private readonly entriesTable = 'payroll_entries';

  constructor(private readonly supabaseService: SupabaseService) {}

  async getPayroll(year: number, month: number): Promise<PayrollResponse> {
    if (!Number.isFinite(year) || !Number.isFinite(month)) {
      throw new BadRequestException('Invalid year or month');
    }

    const client = this.supabaseService.client;

    const { data: run, error: runError } = await client
      .from(this.runsTable)
      .select('id, notes, processed_by, processed_at')
      .eq('year', year)
      .eq('month', month)
      .maybeSingle();

    if (runError) {
      throw new BadRequestException(runError.message);
    }

    if (run) {
      return this.loadEntriesFromRun(run, year, month);
    }

    return this.generatePreview(year, month);
  }

  async savePayroll(dto: SavePayrollDto): Promise<PayrollResponse> {
    if (!dto || !Array.isArray(dto.entries) || dto.entries.length === 0) {
      throw new BadRequestException('Payroll entries are required');
    }

    const year = Number(dto.year);
    const month = Number(dto.month);

    if (!Number.isFinite(year) || !Number.isFinite(month)) {
      throw new BadRequestException('Invalid year or month');
    }

    const processedAt = new Date().toISOString();

    const { data: run, error: upsertError } = await this.supabaseService.client
      .from(this.runsTable)
      .upsert({
        year,
        month,
        processed_by: dto.processedBy ?? null,
        notes: dto.notes ?? null,
        processed_at: processedAt,
      }, { onConflict: 'year,month' })
      .select('id, notes, processed_by, processed_at')
      .single();

    if (upsertError || !run) {
      throw new BadRequestException(upsertError?.message || 'Unable to save payroll run');
    }

    const runId = run.id as string;

    const { error: deleteError } = await this.supabaseService.client
      .from(this.entriesTable)
      .delete()
      .eq('payroll_id', runId);

    if (deleteError) {
      throw new BadRequestException(deleteError.message);
    }

    const entriesPayload = dto.entries.map((entry) => {
      const daysWorked = Number(entry.daysWorked) || 0;
      const dailyRate = Number(entry.dailyRate) || 0;
      const deductions = Number(entry.deductions) || 0;
      const gross = this.round(daysWorked * dailyRate);
      const net = this.round(gross - deductions);

      return {
        payroll_id: runId,
        user_id: entry.userId,
        year,
        month,
        days_worked: daysWorked,
        daily_rate: dailyRate,
        gross_pay: gross,
        deductions,
        net_pay: net,
        remarks: entry.remarks ?? null,
      };
    });

    if (entriesPayload.length) {
      const { error: insertError } = await this.supabaseService.client
        .from(this.entriesTable)
        .insert(entriesPayload);

      if (insertError) {
        throw new BadRequestException(insertError.message);
      }
    }

    return this.loadEntriesFromRun(run, year, month);
  }

  async getEmployeeHistory(userId: string): Promise<EmployeePayslipEntry[]> {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    const { data, error } = await this.supabaseService.client
      .from(this.entriesTable)
      .select('year, month, days_worked, daily_rate, gross_pay, deductions, net_pay, remarks, payroll_runs:payroll_id(processed_at, notes)')
      .eq('user_id', userId)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (error) {
      throw new BadRequestException(error.message);
    }

    const entries = (data as any[] | null) ?? [];

    return entries.map((item) => {
      const processedAt = item.payroll_runs?.processed_at ?? null;
      const notes = item.payroll_runs?.notes ?? null;
      const monthlyDate = new Date(item.year, item.month, 1);
      const periodLabel = monthlyDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      return {
        year: item.year,
        month: item.month,
        periodLabel,
        processedAt,
        notes,
        netPay: Number(item.net_pay) || 0,
        grossPay: Number(item.gross_pay) || 0,
        deductions: Number(item.deductions) || 0,
        dailyRate: Number(item.daily_rate) || 0,
        daysWorked: Number(item.days_worked) || 0,
        remarks: item.remarks ?? null,
      } as EmployeePayslipEntry;
    });
  }

  private async loadEntriesFromRun(run: { id: string; notes?: string | null; processed_by?: string | null; processed_at: string }, year: number, month: number): Promise<PayrollResponse> {
    const client = this.supabaseService.client;

    const [employees, entries] = await Promise.all([
      this.fetchEmployees(),
      client
        .from(this.entriesTable)
        .select('user_id, days_worked, daily_rate, gross_pay, deductions, net_pay, remarks')
        .eq('payroll_id', run.id),
    ]);

    if (entries.error) {
      throw new BadRequestException(entries.error.message);
    }

    const employeeMap = new Map(employees.map((emp) => [emp.userId, emp]));

    const payload = (entries.data || []).map((item) => {
      const employee = employeeMap.get(item.user_id) ?? {
        userId: item.user_id,
        name: 'Unknown Employee',
        department: '',
        position: '',
        dailyRate: Number(item.daily_rate) || 0,
      };

      const entry: PayrollEntryResponse = {
        userId: item.user_id,
        name: employee.name,
        department: employee.department,
        position: employee.position,
        dailyRate: Number(item.daily_rate) || 0,
        daysWorked: Number(item.days_worked) || 0,
        deductions: Number(item.deductions) || 0,
        grossPay: Number(item.gross_pay) || 0,
        netPay: Number(item.net_pay) || 0,
        remarks: item.remarks ?? null,
      };
      return entry;
    });

    const summary = this.computeSummary(payload);

    return {
      processed: true,
      run: {
        id: run.id,
        processedAt: run.processed_at,
        processedBy: run.processed_by ?? null,
        notes: run.notes ?? null,
      },
      entries: payload.sort((a, b) => a.name.localeCompare(b.name)),
      summary,
    };
  }

  private async generatePreview(year: number, month: number): Promise<PayrollResponse> {
    const [employees, schedules] = await Promise.all([
      this.fetchEmployees(),
      this.fetchScheduleEntries(year, month),
    ]);

    const workDaysMap = new Map<string, number>();
    schedules.forEach((entry) => {
      if (!entry.shift || entry.shift === 'O') return;
      const current = workDaysMap.get(entry.user_id) ?? 0;
      workDaysMap.set(entry.user_id, current + 1);
    });

    const entries: PayrollEntryResponse[] = employees.map((emp) => {
      const daysWorked = workDaysMap.get(emp.userId) ?? 0;
      const dailyRate = emp.dailyRate ?? 0;
      const gross = this.round(daysWorked * dailyRate);
      return {
        userId: emp.userId,
        name: emp.name,
        department: emp.department,
        position: emp.position,
        dailyRate,
        daysWorked,
        deductions: 0,
        grossPay: gross,
        netPay: gross,
        remarks: null,
      };
    });

    const summary = this.computeSummary(entries);

    return {
      processed: false,
      run: null,
      entries: entries.sort((a, b) => a.name.localeCompare(b.name)),
      summary,
    };
  }

  private async fetchEmployees(): Promise<Array<{ userId: string; name: string; department: string; position: string; dailyRate: number }>> {
    const { data, error } = await this.supabaseService.client
      .from('users')
      .select('user_id, first_name, last_name, department, position, daily_rate, role, status')
      .eq('status', 'Active')
      .neq('role', 'admin');

    if (error) {
      throw new BadRequestException(error.message);
    }

    const employees = (data as RawEmployee[] | null) ?? [];
    
    // UUID validation regex
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    return employees
      .filter((emp) => {
        const userId = emp.user_id;
        // Only include employees with valid UUID user_id
        return userId && typeof userId === 'string' && uuidRegex.test(userId);
      })
      .map((emp) => {
        const userId = emp.user_id ?? '';
        const name = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Unnamed';
        return {
          userId,
          name,
          department: emp.department || 'Unassigned',
          position: emp.position || '',
          dailyRate: Number(emp.daily_rate) || 0,
        };
      });
  }

  private async fetchScheduleEntries(year: number, month: number): Promise<RawScheduleEntry[]> {
    const { data, error } = await this.supabaseService.client
      .from('employee_schedule_entries')
      .select('user_id, shift')
      .eq('year', year)
      .eq('month', month);

    if (error && error.code !== 'PGRST116') {
      throw new BadRequestException(error.message);
    }

    const entries = (data as RawScheduleEntry[] | null) ?? [];
    
    // Filter out entries with invalid UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return entries.filter((entry) => {
      const userId = entry.user_id;
      return userId && typeof userId === 'string' && uuidRegex.test(userId);
    });
  }

  private computeSummary(entries: PayrollEntryResponse[]) {
    const totals = entries.reduce((acc, entry) => {
      acc.totalGross += entry.grossPay;
      acc.totalDeductions += entry.deductions;
      acc.totalNet += entry.netPay;
      return acc;
    }, { totalGross: 0, totalDeductions: 0, totalNet: 0 });

    return {
      totalGross: this.round(totals.totalGross),
      totalDeductions: this.round(totals.totalDeductions),
      totalNet: this.round(totals.totalNet),
    };
  }

  private round(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
