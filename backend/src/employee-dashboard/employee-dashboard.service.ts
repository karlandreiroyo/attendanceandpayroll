import { BadRequestException, Injectable } from '@nestjs/common';
import { LeaveRequestsService } from '../leave-requests/leave-requests.service';
import { SupabaseService } from '../supabase/supabase.service';

type AnnouncementRecord = {
  id: string;
  title: string;
  body?: string | null;
  audience?: string | null;
  published_at?: string | null;
};

type AttendanceRecord = {
  id: string;
  status: string;
  timestamp: string;
};

@Injectable()
export class EmployeeDashboardService {
  constructor(
    private readonly leaveRequestsService: LeaveRequestsService,
    private readonly supabaseService: SupabaseService,
  ) {}

  async getOverview(employeeId: string, department?: string) {
    const [leaveBalances, announcements, attendance] = await Promise.all([
      this.leaveRequestsService
        .getBalances(employeeId)
        .catch(() => []),
      this.loadAnnouncements(department).catch(() => []),
      this.loadAttendance(employeeId).catch(() => ({
        recent: [],
        summary: { Present: 0, Late: 0, Absent: 0 },
      })),
    ]);

    return {
      leaveBalances,
      announcements,
      attendance,
    };
  }

  private async loadAnnouncements(department?: string) {
    const query = this.supabaseService.client
      .from('announcements')
      .select('id,title,body,published_at,audience')
      .order('published_at', { ascending: false })
      .limit(5);

    if (department) {
      query.or(`audience.is.null,audience.eq.${department}`);
    }

    const { data, error } = await query;

    if (error) {
      // If the table doesn't exist yet, return an empty set gracefully
      if (error.code === '42P01' || error.code === 'PGRST114') {
        return [];
      }
      throw new BadRequestException(error.message);
    }

    return ((data as AnnouncementRecord[]) ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      body: item.body ?? '',
      audience: item.audience ?? null,
      publishedAt: item.published_at ?? null,
    }));
  }

  private async loadAttendance(employeeId: string) {
    const { data, error } = await this.supabaseService.client
      .from('employee_attendance')
      .select('id,status,timestamp')
      .eq('user_id', employeeId)
      .order('timestamp', { ascending: false })
      .limit(20);

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST114') {
        return {
          recent: [],
          summary: { Present: 0, Late: 0, Absent: 0 },
        };
      }
      throw new BadRequestException(error.message);
    }

    const safeStatuses = new Set(['Present', 'Late', 'Absent']);
    const summary = { Present: 0, Late: 0, Absent: 0 };

    ((data as AttendanceRecord[]) ?? []).forEach((item) => {
      const status = safeStatuses.has(item.status) ? item.status : 'Present';
      summary[status as keyof typeof summary] += 1;
    });

    return {
      recent: ((data as AttendanceRecord[]) ?? []).map((item) => ({
        id: item.id,
        status: safeStatuses.has(item.status) ? item.status : 'Present',
        timestamp: item.timestamp,
      })),
      summary,
    };
  }
}

