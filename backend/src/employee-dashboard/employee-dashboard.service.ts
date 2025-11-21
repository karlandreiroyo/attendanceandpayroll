import { BadRequestException, Injectable } from '@nestjs/common';
import { LeaveRequestsService } from '../leave-requests/leave-requests.service';
import { SupabaseService } from '../supabase/supabase.service';
import { AnnouncementsService } from '../announcements/announcements.service';

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
    private readonly announcementsService: AnnouncementsService,
  ) {}

  async getOverview(employeeId: string, department?: string) {
    let leaveBalances: any[] = [];
    let announcements: any[] = [];
    let attendance: any = {
      recent: [],
      summary: { Present: 0, Late: 0, Absent: 0 },
    };

    try {
      console.log(`[getOverview] Fetching leave balances for employeeId: ${employeeId}`);
      leaveBalances = await this.leaveRequestsService.getBalances(employeeId);
      console.log(`[getOverview] Leave balances fetched successfully: ${leaveBalances.length} items`);
      if (leaveBalances.length === 0) {
        console.error('[getOverview] ERROR: Leave balances is empty - this should not happen! Default types should always be returned');
        // Force return default types if somehow empty
        leaveBalances = Object.keys({
          'Vacation': 15,
          'Sick Leave': 10,
          'Personal Leave': 5,
          'Emergency Leave': 3,
        }).map(type => ({
          type,
          allocated: type === 'Vacation' ? 15 : type === 'Sick Leave' ? 10 : type === 'Personal Leave' ? 5 : 3,
          used: 0,
          remaining: type === 'Vacation' ? 15 : type === 'Sick Leave' ? 10 : type === 'Personal Leave' ? 5 : 3,
        }));
        console.log(`[getOverview] Forced default leave balances: ${leaveBalances.length} items`);
      }
    } catch (error: any) {
      console.error('[getOverview] Error fetching leave balances:', error?.message || error);
      // Fallback: force return default types
      leaveBalances = Object.keys({
        'Vacation': 15,
        'Sick Leave': 10,
        'Personal Leave': 5,
        'Emergency Leave': 3,
      }).map(type => ({
        type,
        allocated: type === 'Vacation' ? 15 : type === 'Sick Leave' ? 10 : type === 'Personal Leave' ? 5 : 3,
        used: 0,
        remaining: type === 'Vacation' ? 15 : type === 'Sick Leave' ? 10 : type === 'Personal Leave' ? 5 : 3,
      }));
      console.log(`[getOverview] Fallback: Returning default leave balances: ${leaveBalances.length} items`);
    }

    try {
      announcements = await this.announcementsService.findAll({
        audience: department,
        limit: 5,
      });
      console.log('Announcements fetched successfully:', announcements.length);
    } catch (error: any) {
      // If table doesn't exist, just return empty array (this is expected)
      if (error?.response?.message?.includes('Could not find the table')) {
        console.log('Announcements table does not exist yet - returning empty array');
      } else {
        console.error('Error fetching announcements:', error?.message || error);
      }
      announcements = [];
    }

    try {
      attendance = await this.loadAttendance(employeeId);
      console.log('Attendance fetched successfully');
    } catch (error: any) {
      // If table doesn't exist, just return default structure (this is expected)
      if (error?.response?.message?.includes('Could not find the table')) {
        console.log('Employee attendance table does not exist yet - returning default structure');
      } else {
        console.error('Error fetching attendance:', error?.message || error);
      }
      attendance = {
        recent: [],
        summary: { Present: 0, Late: 0, Absent: 0 },
      };
    }

    return {
      leaveBalances,
      announcements,
      attendance,
    };
  }

  private async loadAttendance(employeeId: string) {
    // Fetch from the attendance table (same table used by attendance service)
    const { data, error } = await this.supabaseService.client
      .from('attendance')
      .select('attendance_id, id, employee_id, date, time_in, time_out, status, total_hours')
      .eq('employee_id', employeeId)
      .order('date', { ascending: false })
      .order('time_in', { ascending: false })
      .limit(30);

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

    // Process records to build summary and recent list
    const records = (data as any[]) ?? [];
    const recentRecords: any[] = [];

    records.forEach((record) => {
      const status = safeStatuses.has(record.status) ? record.status : 'Present';
      summary[status as keyof typeof summary] += 1;

      // Create a timestamp from date and time_in for recent records
      if (record.date && record.time_in) {
        const timestamp = new Date(`${record.date}T${record.time_in}`).toISOString();
        recentRecords.push({
          id: record.attendance_id || record.id,
          status: status,
          timestamp: timestamp,
        });
      }
    });

    // Sort recent records by timestamp descending
    recentRecords.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      recent: recentRecords.slice(0, 20), // Return top 20 most recent
      summary,
    };
  }
}

