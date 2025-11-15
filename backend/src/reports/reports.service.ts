import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

type DateRangeInput = {
  start?: string;
  end?: string;
};

type DepartmentFilterInput = {
  department?: string;
};

type AttendanceSummaryItem = {
  department: string;
  totalEmployees: number;
  present: number;
  late: number;
  absent: number;
};

type LeaveSummaryItem = {
  department: string;
  totalEmployees: number;
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
  totalDays: number;
};

type PayrollSummaryItem = {
  year: number;
  month: number;
  label: string;
  headcount: number;
  totalGross: number;
  totalNet: number;
  totalDeductions: number;
};

type BaseListItem = {
  id: string;
  name: string;
  department: string;
  position: string;
  status: string;
  joinDate: string | null;
  email: string;
  role: string;
};

type EmployeeListItem = BaseListItem;
type AdminListItem = BaseListItem;

type JoinedSingle<T> = T | T[] | null | undefined;

const unwrapJoined = <T>(value: JoinedSingle<T>): T | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value ?? undefined;
};

@Injectable()
export class ReportsService {
  constructor(private readonly supabaseService: SupabaseService) { }

  private normaliseDate(value?: string, fallback?: string): string {
    if (!value) {
      if (!fallback) {
        return new Date().toISOString();
      }
      return fallback;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`Invalid date value: ${value}`);
    }
    return parsed.toISOString();
  }

  private normaliseDateEnd(value?: string, fallback?: string): string {
    const iso = this.normaliseDate(value, fallback);
    const date = new Date(iso);
    date.setHours(23, 59, 59, 999);
    return date.toISOString();
  }

  private async loadUsers(params?: { department?: string; roles?: string[] }) {
    const { department, roles } = params ?? {};
    const query = this.supabaseService.client
      .from('users')
      .select('user_id, first_name, last_name, department, position, status, join_date, email, role');

    if (department) {
      query.eq('department', department);
    }

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(error.message);
    }

    const filteredRoles = (roles ?? []).map((role) => role.toLowerCase());

    return (data ?? [])
      .filter((emp) => {
        if (!filteredRoles.length) {
          return true;
        }
        const role = (emp.role ?? '').toLowerCase();
        return filteredRoles.includes(role);
      })
      .map((emp) => ({
        id: emp.user_id ?? '',
        name: (() => {
          const fullName = `${emp.first_name ?? ''} ${emp.last_name ?? ''}`.trim();
          if (fullName) {
            return fullName;
          }
          if (emp.email) {
            return emp.email;
          }
          return 'Unknown User';
        })(),
        department: emp.department ?? 'Unassigned',
        position: emp.position ?? '',
        status: emp.status ?? 'Active',
        joinDate: emp.join_date ?? null,
        email: emp.email ?? '',
        role: (emp.role ?? 'employee').toLowerCase(),
      }))
      .filter((emp) => emp.id);
  }

  async getEmployeeList(params: DepartmentFilterInput): Promise<{ employees: EmployeeListItem[] }> {
    const department =
      params.department && params.department !== 'All Departments'
        ? params.department
        : undefined;
    const employees = await this.loadUsers({ department, roles: ['employee'] });
    return { employees };
  }

  async getAdminList(params: DepartmentFilterInput): Promise<{ admins: AdminListItem[] }> {
    const department =
      params.department && params.department !== 'All Departments'
        ? params.department
        : undefined;
    const admins = await this.loadUsers({ department, roles: ['admin'] });
    return { admins };
  }

  async getAttendanceSummary(params: DateRangeInput & DepartmentFilterInput): Promise<{
    departments: AttendanceSummaryItem[];
    totals: AttendanceSummaryItem;
  }> {
    const startIso = this.normaliseDate(params.start);
    const endIso = this.normaliseDateEnd(params.end, startIso);
    if (new Date(startIso) > new Date(endIso)) {
      throw new BadRequestException('The start date must be before the end date.');
    }

    const departmentFilter =
      params.department && params.department !== 'All Departments'
        ? params.department
        : undefined;

    const allEmployees = await this.loadUsers({ roles: ['employee'] });
    const employees = departmentFilter
      ? allEmployees.filter((emp) => emp.department === departmentFilter)
      : allEmployees;

    const departmentCounts = new Map<string, AttendanceSummaryItem>();
    employees.forEach((emp) => {
      if (!departmentCounts.has(emp.department)) {
        departmentCounts.set(emp.department, {
          department: emp.department,
          totalEmployees: 0,
          present: 0,
          late: 0,
          absent: 0,
        });
      }
      const item = departmentCounts.get(emp.department)!;
      item.totalEmployees += 1;
    });

    const attendanceQuery = this.supabaseService.client
      .from('employee_attendance')
      .select(
        `
        id,
        user_id,
        status,
        timestamp,
        users!inner (
          department
        )
      `,
      )
      .gte('timestamp', startIso)
      .lte('timestamp', endIso);

    if (departmentFilter) {
      attendanceQuery.eq('users.department', departmentFilter);
    }

    const { data, error } = await attendanceQuery;

    if (error) {
      // If the table doesn't exist yet, return an empty set gracefully
      if (
        error.code === '42P01' ||
        error.code === 'PGRST114' ||
        error.message?.includes("schema cache")
      ) {
        return {
          departments: Array.from(departmentCounts.values()),
          totals: {
            department: 'All',
            totalEmployees: Array.from(departmentCounts.values()).reduce((sum, item) => sum + item.totalEmployees, 0),
            present: 0,
            late: 0,
            absent: 0,
          },
        };
      }
      throw new BadRequestException(error.message);
    }

    const safeStatuses = new Set(['Present', 'Late', 'Absent']);

    (data ?? []).forEach((record) => {
      const user = unwrapJoined<{ department?: string | null }>(record.users);
      const department = user?.department ?? 'Unassigned';
      if (!departmentCounts.has(department)) {
        departmentCounts.set(department, {
          department,
          totalEmployees: 0,
          present: 0,
          late: 0,
          absent: 0,
        });
      }
      const item = departmentCounts.get(department)!;
      const status = safeStatuses.has(record.status) ? record.status : 'Present';
      if (status === 'Present') item.present += 1;
      if (status === 'Late') item.late += 1;
      if (status === 'Absent') item.absent += 1;
    });

    const departments = Array.from(departmentCounts.values()).sort((a, b) =>
      a.department.localeCompare(b.department),
    );

    const totals = departments.reduce(
      (acc, item) => {
        acc.totalEmployees += item.totalEmployees;
        acc.present += item.present;
        acc.late += item.late;
        acc.absent += item.absent;
        return acc;
      },
      { department: 'All Departments', totalEmployees: 0, present: 0, late: 0, absent: 0 },
    );

    return { departments, totals };
  }

  private calculateLeaveDuration(start?: string | null, end?: string | null) {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;
    const diff = endDate.getTime() - startDate.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(days, 0);
  }

  async getLeaveSummary(params: DateRangeInput & DepartmentFilterInput): Promise<{
    departments: LeaveSummaryItem[];
    totals: LeaveSummaryItem;
  }> {
    const startIso = this.normaliseDate(params.start);
    const endIso = this.normaliseDateEnd(params.end, startIso);
    if (new Date(startIso) > new Date(endIso)) {
      throw new BadRequestException('The start date must be before the end date.');
    }

    const departmentFilter =
      params.department && params.department !== 'All Departments'
        ? params.department
        : undefined;

    const allEmployees = await this.loadUsers({ roles: ['employee'] });
    const employees = departmentFilter
      ? allEmployees.filter((emp) => emp.department === departmentFilter)
      : allEmployees;
    const employeeDepartmentMap = new Map(allEmployees.map((emp) => [emp.id, emp.department]));

    const summary = new Map<string, LeaveSummaryItem>();
    employees.forEach((emp) => {
      if (!summary.has(emp.department)) {
        summary.set(emp.department, {
          department: emp.department,
          totalEmployees: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          cancelled: 0,
          totalDays: 0,
        });
      }
      const bucket = summary.get(emp.department)!;
      bucket.totalEmployees += 1;
    });

    const { data, error } = await this.supabaseService.client
      .from('leave_requests')
      .select('id, status, start_date, end_date, employee_id')
      .gte('start_date', startIso)
      .lte('end_date', endIso);

    if (error) {
      throw new BadRequestException(error.message);
    }

    (data ?? []).forEach((request) => {
      const department =
        allEmployees.find((emp) => emp.id === (request.employee_id ?? ''))?.department ??
        'Unassigned';
      if (departmentFilter && department !== departmentFilter) {
        return;
      }
      if (!summary.has(department)) {
        summary.set(department, {
          department,
          totalEmployees: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          cancelled: 0,
          totalDays: 0,
        });
      }
      const bucket = summary.get(department)!;
      switch (request.status) {
        case 'Pending':
          bucket.pending += 1;
          break;
        case 'Approved':
          bucket.approved += 1;
          bucket.totalDays += this.calculateLeaveDuration(request.start_date, request.end_date);
          break;
        case 'Rejected':
          bucket.rejected += 1;
          break;
        case 'Cancelled':
          bucket.cancelled += 1;
          break;
        default:
          break;
      }
    });

    const departments = Array.from(summary.values()).sort((a, b) =>
      a.department.localeCompare(b.department),
    );

    const totals = departments.reduce(
      (acc, item) => {
        acc.totalEmployees += item.totalEmployees;
        acc.pending += item.pending;
        acc.approved += item.approved;
        acc.rejected += item.rejected;
        acc.cancelled += item.cancelled;
        acc.totalDays += item.totalDays;
        return acc;
      },
      { department: 'All Departments', totalEmployees: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0, totalDays: 0 },
    );

    return { departments, totals };
  }

  async getPayrollSummary(params: DateRangeInput & DepartmentFilterInput): Promise<{
    periods: PayrollSummaryItem[];
    totals: {
      headcount: number;
      totalGross: number;
      totalNet: number;
      totalDeductions: number;
    };
  }> {
    const startIso = this.normaliseDate(params.start);
    const endIso = this.normaliseDateEnd(params.end, startIso);
    if (new Date(startIso) > new Date(endIso)) {
      throw new BadRequestException('The start date must be before the end date.');
    }

    const departmentFilter =
      params.department && params.department !== 'All Departments'
        ? params.department
        : undefined;

    const employees = await this.loadUsers({ roles: ['employee'] });
    const employeesById = new Map(employees.map((emp) => [emp.id, emp]));

    const entriesQuery = this.supabaseService.client
      .from('payroll_entries')
      .select(
        `
        payroll_id,
        user_id,
        gross_pay,
        net_pay,
        deductions,
        payroll_runs!inner (
          id,
          year,
          month,
          processed_at
        )
      `,
      )
      .gte('payroll_runs.processed_at', startIso)
      .lte('payroll_runs.processed_at', endIso);

    const { data, error } = await entriesQuery;

    if (error) {
      // If payroll tables are missing we should respond with empty data
      if (
        error.code === '42P01' ||
        error.code === 'PGRST114' ||
        error.message?.includes("schema cache")
      ) {
        return {
          periods: [],
          totals: { headcount: 0, totalGross: 0, totalNet: 0, totalDeductions: 0 },
        };
      }
      throw new BadRequestException(error.message);
    }

    const periodMap = new Map<string, PayrollSummaryItem>();

    (data ?? []).forEach((entry) => {
      const user = employeesById.get(entry.user_id);
      if (departmentFilter && (!user || user.department !== departmentFilter)) {
        return;
      }
      const payrollRun = unwrapJoined<{ year?: number | null; month?: number | null }>(entry.payroll_runs);
      const periodYear = payrollRun?.year ?? 0;
      const periodMonth = payrollRun?.month ?? 0;
      const key = `${periodYear}-${String(periodMonth).padStart(2, '0')}`;
      if (!periodMap.has(key)) {
        const labelDate = new Date(periodYear, (periodMonth || 1) - 1, 1);
        const label = `${labelDate.toLocaleString('default', {
          month: 'long',
        })} ${periodYear}`;
        periodMap.set(key, {
          year: periodYear,
          month: periodMonth,
          label,
          headcount: 0,
          totalGross: 0,
          totalNet: 0,
          totalDeductions: 0,
        });
      }
      const bucket = periodMap.get(key)!;
      bucket.headcount += 1;
      bucket.totalGross += Number(entry.gross_pay ?? 0);
      bucket.totalNet += Number(entry.net_pay ?? 0);
      bucket.totalDeductions += Number(entry.deductions ?? 0);
    });

    const periods = Array.from(periodMap.values()).sort((a, b) => {
      if (a.year === b.year) {
        return a.month - b.month;
      }
      return a.year - b.year;
    });

    const totals = periods.reduce(
      (acc, item) => {
        acc.headcount += item.headcount;
        acc.totalGross += item.totalGross;
        acc.totalNet += item.totalNet;
        acc.totalDeductions += item.totalDeductions;
        return acc;
      },
      { headcount: 0, totalGross: 0, totalNet: 0, totalDeductions: 0 },
    );

    return { periods, totals };
  }
}


