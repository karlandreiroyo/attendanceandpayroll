import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

// Shift definitions matching frontend
const SHIFT_DEFINITIONS: Record<string, { startHour: number; startMinute: number }> = {
  M: { startHour: 8, startMinute: 0 },   // Morning: 8:00 AM
  A: { startHour: 14, startMinute: 0 },   // Afternoon: 2:00 PM (14:00)
  N: { startHour: 22, startMinute: 0 },    // Night: 10:00 PM (22:00)
  O: { startHour: 0, startMinute: 0 },    // Day Off: no start time
};

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
    // First check if there are multiple users with this fingerprint ID (shouldn't happen, but handle it)
    const fingerprintIdStr = String(fingerprintId);
    
    // Use .select() without .maybeSingle() first to check for duplicates
    // Users table only has user_id column, not id
    const { data: users, error: userError } = await this.supabaseService.client
      .from('users')
      .select('user_id, username, first_name, last_name, department, status, finger_template_id')
      .eq('finger_template_id', fingerprintIdStr)
      .not('finger_template_id', 'is', null); // Exclude null values

    if (userError) {
      throw new BadRequestException(`Error finding user: ${userError.message}`);
    }

    if (!users || users.length === 0) {
      throw new BadRequestException(
        `No employee found with fingerprint ID ${fingerprintId}. Please ensure the fingerprint is enrolled and assigned to an employee.`,
      );
    }

    if (users.length > 1) {
      // Multiple users have the same fingerprint ID - this is a data integrity issue
      // Show detailed information to help identify the problematic records
      // Users table only has user_id, not id
      const userDetails = users.map(u => {
        const name = `${u.first_name || ''} ${u.last_name || ''}`.trim();
        const displayName = name || u.username || `User ID ${u.user_id}` || 'Unknown';
        return `${displayName} (User ID: ${u.user_id}${u.username ? `, Username: ${u.username}` : ''})`;
      }).join(', ');
      
      throw new BadRequestException(
        `Data integrity error: Multiple employees (${users.length}) have the same fingerprint ID ${fingerprintId}: ${userDetails}. Please contact administrator to fix duplicate fingerprint assignments. You can use the Fingerprint Management modal to clear this ID from all employees.`,
      );
    }

    const user = users[0];

    if (user.status !== 'Active') {
      throw new BadRequestException('Employee account is not active');
    }

    // IMPORTANT: The foreign key constraint references employees.employee_id, not users.user_id
    // We need to find the corresponding employee record, or create one if it doesn't exist
    // Use .select() first to handle cases where multiple records might exist
    const { data: employees, error: employeeError } = await this.supabaseService.client
      .from('employees')
      .select('employee_id, user_id, first_name, last_name')
      .eq('user_id', user.user_id); // Link users to employees via user_id

    if (employeeError) {
      throw new BadRequestException(
        `Error finding employee record: ${employeeError.message}`,
      );
    }

    // Handle multiple employee records (data integrity issue)
    if (employees && employees.length > 1) {
      console.warn(`[ATTENDANCE] Multiple employee records found for user_id ${user.user_id}, using the first one`);
      // Use the first employee record
    }

    let employee = employees && employees.length > 0 ? employees[0] : null;

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

      // If record has time_in but no time_out, check if enough time has passed
      if (latestRecord.time_in && !latestRecord.time_out) {
        // Calculate time difference between time_in and now
        const [timeInHours, timeInMinutes] = latestRecord.time_in.split(':').map(Number);
        const [currentHours, currentMinutes] = currentTime.split(':').map(Number);
        
        const timeInTotalMinutes = timeInHours * 60 + timeInMinutes;
        const currentTotalMinutes = currentHours * 60 + currentMinutes;
        const diffMinutes = currentTotalMinutes - timeInTotalMinutes;
        
        // Minimum 2 minutes between time in and time out to prevent accidental immediate time outs
        const MIN_TIME_BETWEEN_IN_OUT = 2;
        
        if (diffMinutes >= MIN_TIME_BETWEEN_IN_OUT) {
          // Enough time has passed, allow time out
          isTimeIn = false;
          recordToUpdate = latestRecord;
        } else {
          // Not enough time has passed, treat as new time in (or show error)
          const remainingSeconds = (MIN_TIME_BETWEEN_IN_OUT - diffMinutes) * 60;
          throw new BadRequestException(
            `Please wait at least ${MIN_TIME_BETWEEN_IN_OUT} minutes between time in and time out. You can time out in ${Math.ceil(remainingSeconds)} second${Math.ceil(remainingSeconds) !== 1 ? 's' : ''}.`,
          );
        }
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

      // Determine status based on scheduled start time
      // Try both user_id formats (number and UUID string)
      const userIdStr = String(user.user_id);
      const scheduledStart = await this.getScheduledStartTime(userIdStr, todayDateStr);
      console.log(`[ATTENDANCE] Scheduled start for user ${userIdStr}:`, scheduledStart ? `${scheduledStart.startHour}:${scheduledStart.startMinute}` : 'not found');
      console.log(`[ATTENDANCE] Time in: ${currentTime}, Is late: ${this.isLate(currentTime, scheduledStart)}`);
      const attendanceStatus = this.isLate(currentTime, scheduledStart) ? 'Late' : 'Present';

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
              status: attendanceStatus,
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

      // Preserve the existing status (could be 'Late' or 'Present' from time in)
      const existingStatus = recordToUpdate.status || 'Present';

      const { data: updatedRecord, error: updateError } =
        await this.supabaseService.client
          .from('attendance')
          .update({
            time_out: currentTime,
            total_hours: totalHoursDecimal,
            status: existingStatus, // Preserve the status from time in
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
    // Join through employees to get user information
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
        employees!inner (
          employee_id,
          user_id,
          users!inner (
            user_id,
            first_name,
            last_name,
            department
          )
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
      query = query.eq('employees.users.department', params.department);
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

    // Process records sequentially to handle async schedule lookups
    for (const record of records) {
      const employeeId = record.employee_id;
      // Extract user info from nested structure: record.employees.users
      const employees = Array.isArray(record.employees) ? record.employees[0] : record.employees;
      const users = Array.isArray(employees?.users) ? employees.users[0] : employees?.users;
      
      if (!userRecords.has(employeeId)) {
        userRecords.set(employeeId, {
          id: record.attendance_id,
          employee_id: employeeId,
          name: `${users?.first_name || ''} ${users?.last_name || ''}`.trim(),
          empId: users?.user_id,
          dept: users?.department || '',
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

        // Get scheduled start time for this employee on this date
        const userId = users?.user_id;
        if (userId) {
          const scheduledStart = await this.getScheduledStartTime(String(userId), record.date || date);
          if (this.isLate(record.time_in, scheduledStart)) {
            userRecord.status = 'Late';
          } else {
            userRecord.status = 'Present';
          }
        } else {
          // Fallback to default check if no user_id
          const [hours, minutes] = record.time_in.split(':').map(Number);
          if (hours > 9 || (hours === 9 && minutes > 0)) {
            userRecord.status = 'Late';
          } else {
            userRecord.status = 'Present';
          }
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
    }

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

  /**
   * Get the scheduled start time for an employee on a specific date
   */
  private async getScheduledStartTime(
    userId: string,
    date: string,
  ): Promise<{ startHour: number; startMinute: number } | null> {
    try {
      const dateObj = new Date(date);
      const year = dateObj.getFullYear();
      // Frontend sends 0-indexed months (0-11), database stores 0-indexed months
      const month = dateObj.getMonth(); // Keep 0-indexed to match database
      const day = dateObj.getDate();

      console.log(`[ATTENDANCE] Looking up schedule for user_id: ${userId}, date: ${date}, year: ${year}, month: ${month} (0-indexed), day: ${day}`);

      // First try to get from employee_schedule_entries table
      const { data: entry, error: entryError } = await this.supabaseService.client
        .from('employee_schedule_entries')
        .select('shift')
        .eq('user_id', userId)
        .eq('year', year)
        .eq('month', month)
        .eq('day', day)
        .maybeSingle();

      if (entryError) {
        console.log(`[ATTENDANCE] Error querying employee_schedule_entries:`, entryError.message);
      }

      if (!entryError && entry && entry.shift) {
        console.log(`[ATTENDANCE] Found shift in employee_schedule_entries: ${entry.shift}`);
        const shiftDef = SHIFT_DEFINITIONS[entry.shift];
        if (shiftDef) {
          console.log(`[ATTENDANCE] Shift definition found: ${entry.shift} -> ${shiftDef.startHour}:${shiftDef.startMinute}`);
          return shiftDef;
        }
      }

      // Fallback: try to get from employee_schedules table (JSON shifts field)
      const { data: schedule, error: scheduleError } = await this.supabaseService.client
        .from('employee_schedules')
        .select('shifts')
        .eq('year', year)
        .eq('month', month)
        .maybeSingle();

      if (scheduleError) {
        console.log(`[ATTENDANCE] Error querying employee_schedules:`, scheduleError.message);
      }

      if (!scheduleError && schedule && schedule.shifts) {
        const shiftKey = `${userId}-${day}`;
        const shiftCode = schedule.shifts[shiftKey];
        console.log(`[ATTENDANCE] Checking shifts JSON for key "${shiftKey}": ${shiftCode}`);
        if (shiftCode) {
          const shiftDef = SHIFT_DEFINITIONS[shiftCode];
          if (shiftDef) {
            console.log(`[ATTENDANCE] Shift definition found from JSON: ${shiftCode} -> ${shiftDef.startHour}:${shiftDef.startMinute}`);
            return shiftDef;
          }
        }
      }

      console.log(`[ATTENDANCE] No schedule found for user_id: ${userId}, date: ${date}`);
      return null;
    } catch (error) {
      console.error('[ATTENDANCE] Error fetching schedule:', error);
      return null;
    }
  }

  /**
   * Determine if a time-in is late based on the scheduled start time
   */
  private isLate(timeIn: string, scheduledStart: { startHour: number; startMinute: number } | null): boolean {
    if (!scheduledStart || scheduledStart.startHour === 0) {
      // No schedule or day off - use default 9:00 AM check
      const [hours, minutes] = timeIn.split(':').map(Number);
      return hours > 9 || (hours === 9 && minutes > 0);
    }

    const [hours, minutes] = timeIn.split(':').map(Number);
    const timeInMinutes = hours * 60 + minutes;
    const scheduledMinutes = scheduledStart.startHour * 60 + scheduledStart.startMinute;

    // Allow 15 minutes grace period
    const gracePeriod = 15;
    return timeInMinutes > scheduledMinutes + gracePeriod;
  }
}
