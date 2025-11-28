import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

type AttendanceRecord = {
  attendance_id?: string;
  id?: string;
  employee_id: string;
  date: string;
  time_in?: string | null;
  time_out?: string | null;
  total_hours?: number | null;
  status: string;
  record_source?: string | null;
};

@Injectable()
export class AttendanceService {
  // Track cooldown per employee (by fingerprint ID) - 1 minute cooldown
  private readonly employeeCooldowns = new Map<number, number>();
  private readonly COOLDOWN_MS = 60000; // 1 minute

  constructor(private readonly supabaseService: SupabaseService) {}
  
  /**
   * Check if employee is in cooldown period
   */
  private isInCooldown(fingerprintId: number): { inCooldown: boolean; waitSeconds?: number } {
    const lastScanTime = this.employeeCooldowns.get(fingerprintId);
    if (!lastScanTime) {
      return { inCooldown: false };
    }
    
    const now = Date.now();
    const timeSinceLastScan = now - lastScanTime;
    
    if (timeSinceLastScan < this.COOLDOWN_MS) {
      const waitSeconds = Math.ceil((this.COOLDOWN_MS - timeSinceLastScan) / 1000);
      return { inCooldown: true, waitSeconds };
    }
    
    // Cooldown expired, remove from map
    this.employeeCooldowns.delete(fingerprintId);
    return { inCooldown: false };
  }
  
  /**
   * Set cooldown for employee after successful scan
   */
  private setCooldown(fingerprintId: number): void {
    this.employeeCooldowns.set(fingerprintId, Date.now());
    
    // Auto-cleanup after cooldown expires (set timeout to remove from map)
    setTimeout(() => {
      this.employeeCooldowns.delete(fingerprintId);
    }, this.COOLDOWN_MS);
  }

  /**
   * Record time in/out based on fingerprint ID
   */
  async recordAttendance(fingerprintId: number): Promise<{
    success: boolean;
    message: string;
    type: 'Time In' | 'Time Out';
    timestamp: string;
    employee?: {
      id: string;
      name: string;
      department: string;
    };
  }> {
    // Check if this employee is in cooldown period
    const cooldownCheck = this.isInCooldown(fingerprintId);
    if (cooldownCheck.inCooldown) {
      throw new BadRequestException(
        `Please wait ${cooldownCheck.waitSeconds} second${cooldownCheck.waitSeconds !== 1 ? 's' : ''} before scanning again.`,
      );
    }
    
    // Find user by fingerprint template ID
    // Lookup user by fingerprint id (stored as string in DB, but we receive as number)
    const { data: user, error: userError } = await this.supabaseService.client
      .from('users')
      .select('user_id, first_name, last_name, department, status')
      .eq('finger_template_id', String(fingerprintId)) // Convert to string for comparison
      .maybeSingle();

    if (userError) {
      throw new BadRequestException(`Error finding user: ${userError.message}`);
    }

    if (!user) {
      throw new BadRequestException(
        'No employee found with this fingerprint ID',
      );
    }

    if (user.status !== 'Active') {
      throw new BadRequestException('Employee account is not active');
    }

    // IMPORTANT: The foreign key constraint references employees.employee_id, not users.user_id
    // We need to find the corresponding employee record, or create one if it doesn't exist
    let { data: employee, error: employeeError } = await this.supabaseService.client
      .from('employees')
      .select('employee_id, user_id, first_name, last_name')
      .eq('user_id', user.user_id) // Link users to employees via user_id
      .maybeSingle();

    if (employeeError) {
      throw new BadRequestException(
        `Error finding employee record: ${employeeError.message}`,
      );
    }

    // If employee record doesn't exist, create it
    if (!employee || !employee.employee_id) {
      console.log(`[ATTENDANCE] Employee record not found for user_id ${user.user_id}, creating one...`);
      
      // Create employee record with user_id as the link
      const { data: newEmployee, error: createError } = await this.supabaseService.client
        .from('employees')
        .insert([
          {
            user_id: user.user_id,
            first_name: user.first_name,
            last_name: user.last_name,
          },
        ])
        .select('employee_id, user_id, first_name, last_name')
        .single();

      if (createError) {
        throw new BadRequestException(
          `Failed to create employee record: ${createError.message}. Please ensure the employee record exists in the employees table for user_id ${user.user_id}.`,
        );
      }

      employee = newEmployee;
      console.log(`[ATTENDANCE] Created employee record with employee_id: ${employee.employee_id}`);
    }

    // Use employee_id from employees table (this is what the foreign key references)
    const employeeId = employee.employee_id;
    console.log(`[ATTENDANCE] Using employees.employee_id (${employeeId}) for attendance record`);
    
    const today = new Date();
    const todayDateStr = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD

    // Check if there's already a record for today
    const { data: existingRecords, error: checkError } =
      await this.supabaseService.client
        .from('attendance')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('date', todayDateStr)
        .order('time_in', { ascending: false });

    if (checkError) {
      throw new BadRequestException(
        `Error checking existing records: ${checkError.message}`,
      );
    }

    const now = new Date();
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // Format: HH:MM
    const employeeName =
      `${user.first_name || ''} ${user.last_name || ''}`.trim();

    // Determine if this is Time In or Time Out
    let isTimeIn = true;
    let recordToUpdate: AttendanceRecord | null = null;

    if (existingRecords && existingRecords.length > 0) {
      // Find the most recent record for today
      const latestRecord = existingRecords[0] as AttendanceRecord;

      // If record has time_in but no time_out, this is Time Out
      if (latestRecord.time_in && !latestRecord.time_out) {
        isTimeIn = false;
        recordToUpdate = latestRecord;
      }
      // If record has both time_in and time_out, create a new Time In (for multiple entries)
      else if (latestRecord.time_in && latestRecord.time_out) {
        isTimeIn = true;
      }
      // Otherwise, create new Time In
    }

    if (isTimeIn) {
      // Create new Time In record
      // employeeId is already determined above, just verify it exists
      console.log(`[ATTENDANCE] Inserting attendance record with employee_id: ${employeeId}`);

      const { data: newRecord, error: insertError } =
        await this.supabaseService.client
          .from('attendance')
          .insert([
            {
              employee_id: employeeId,
              date: todayDateStr,
              time_in: currentTime,
              time_out: null,
              total_hours: null,
              status: 'Present',
              record_source: 'fingerprint',
            },
          ])
          .select('*')
          .single();

      if (insertError) {
        // Provide more detailed error message for foreign key constraint violations
        const errorMsg = insertError.message || String(insertError);
        if (errorMsg.includes('foreign key constraint') || errorMsg.includes('fkey')) {
          throw new BadRequestException(
            `Cannot record attendance: Employee ID "${employeeId}" does not exist in the users table or the foreign key constraint is violated. Please ensure the employee is properly registered with a valid user_id. Error: ${errorMsg}`,
          );
        }
        throw new BadRequestException(
          `Error recording time in: ${errorMsg}. Employee ID: ${employeeId}`,
        );
      }

      // Set cooldown for this employee after successful time in
      this.setCooldown(fingerprintId);
      
      return {
        success: true,
        message: `Time In recorded for ${employeeName}`,
        type: 'Time In',
        timestamp: now.toISOString(),
        employee: {
          id: String(employeeId),
          name: employeeName,
          department: user.department || '',
        },
      };
    } else {
      // Update existing record with Time Out
      if (!recordToUpdate) {
        throw new BadRequestException('No time in record found to update');
      }

      // Calculate total hours
      const [timeInHours, timeInMinutes] = (recordToUpdate.time_in || '00:00')
        .split(':')
        .map(Number);
      const [timeOutHours, timeOutMinutes] = currentTime.split(':').map(Number);
      const timeInTotalMinutes = timeInHours * 60 + timeInMinutes;
      const timeOutTotalMinutes = timeOutHours * 60 + timeOutMinutes;
      const diffMinutes = timeOutTotalMinutes - timeInTotalMinutes;
      const totalHoursDecimal = diffMinutes / 60;

      // Some schemas use 'attendance_id' as PK, others use 'id'. Determine which to use.
      const asAny = recordToUpdate as any;
      const pkKey = asAny.attendance_id
        ? 'attendance_id'
        : asAny.id
          ? 'id'
          : null;
      const pkValue = pkKey ? asAny[pkKey] : null;
      if (!pkKey || !pkValue) {
        throw new BadRequestException(
          'Unable to determine attendance record primary key',
        );
      }

      const { data: updatedRecord, error: updateError } =
        await this.supabaseService.client
          .from('attendance')
          .update({
            time_out: currentTime,
            total_hours: totalHoursDecimal,
            status: 'Present',
          })
          .eq(pkKey, pkValue)
          .select('*')
          .single();

      if (updateError) {
        throw new BadRequestException(
          `Error recording time out: ${updateError.message}`,
        );
      }

      // Format total hours for display
      const hours = Math.floor(totalHoursDecimal);
      const minutes = Math.round((totalHoursDecimal - hours) * 60);
      const totalHoursStr = `${hours}:${minutes.toString().padStart(2, '0')}`;

      // Set cooldown for this employee after successful time out
      this.setCooldown(fingerprintId);
      
      return {
        success: true,
        message: `Time Out recorded for ${employeeName}. Total hours: ${totalHoursStr}`,
        type: 'Time Out',
        timestamp: now.toISOString(),
        employee: {
          id: String(employeeId),
          name: employeeName,
          department: user.department || '',
        },
      };
    }
  }

  /**
   * Get attendance records for a specific date range
   */
  async getAttendance(params: {
    startDate?: string;
    endDate?: string;
    userId?: string;
    department?: string;
  }): Promise<AttendanceRecord[]> {
    let query = this.supabaseService.client
      .from('attendance')
      .select(
        `
        attendance_id,
        employee_id,
        date,
        time_in,
        time_out,
        total_hours,
        status,
        record_source,
        users!inner (
          user_id,
          first_name,
          last_name,
          department
        )
      `,
      )
      .order('date', { ascending: false })
      .order('time_in', { ascending: false });

    if (params.startDate) {
      query = query.gte('date', params.startDate);
    }

    if (params.endDate) {
      query = query.lte('date', params.endDate);
    }

    if (params.userId) {
      query = query.eq('employee_id', params.userId);
    }

    if (params.department && params.department !== 'All Departments') {
      query = query.eq('users.department', params.department);
    }

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(
        `Error fetching attendance: ${error.message}`,
      );
    }

    return (data as any[]) ?? [];
  }

  /**
   * Get attendance summary for a specific date
   */
  async getAttendanceSummary(
    date: string,
    department?: string,
  ): Promise<{
    present: number;
    late: number;
    absent: number;
    total: number;
    records: any[];
  }> {
    const records = await this.getAttendance({
      startDate: date,
      endDate: date,
      department,
    });

    // Process records to determine daily status
    const userRecords = new Map<string, any>();

    records.forEach((record: any) => {
      const employeeId = record.employee_id;
      if (!userRecords.has(employeeId)) {
        userRecords.set(employeeId, {
          id: record.attendance_id,
          employee_id: employeeId,
          name: `${record.users?.first_name || ''} ${record.users?.last_name || ''}`.trim(),
          empId: record.users?.user_id,
          dept: record.users?.department || '',
          date: record.date || date,
          in: record.time_in || null,
          out: record.time_out || null,
          status: 'Absent',
          total: record.total_hours
            ? this.formatHours(record.total_hours)
            : '0:00',
        });
      }

      const userRecord = userRecords.get(employeeId);

      // Update with time_in if available
      if (record.time_in) {
        userRecord.in = record.time_in;

        // Check if late (assuming 09:00 is standard start time)
        const [hours, minutes] = record.time_in.split(':').map(Number);
        if (hours > 9 || (hours === 9 && minutes > 0)) {
          userRecord.status = 'Late';
        } else {
          userRecord.status = 'Present';
        }
      }

      // Update with time_out if available
      if (record.time_out) {
        userRecord.out = record.time_out;
      }

      // Update total hours if available
      if (record.total_hours) {
        userRecord.total = this.formatHours(record.total_hours);
      }
    });

    const recordsArray = Array.from(userRecords.values());
    const present = recordsArray.filter((r) => r.status === 'Present').length;
    const late = recordsArray.filter((r) => r.status === 'Late').length;
    const absent = recordsArray.filter((r) => r.status === 'Absent').length;

    return {
      present,
      late,
      absent,
      total: recordsArray.length,
      records: recordsArray,
    };
  }

  private formatHours(decimalHours: number): string {
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  }
}
