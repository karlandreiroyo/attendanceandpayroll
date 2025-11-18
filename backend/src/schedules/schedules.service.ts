import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface ScheduleRecord {
  id: string;
  year: number;
  month: number;
  shifts: Record<string, string>;
  saved_by?: string | null;
  updated_at: string;
}

export interface SaveScheduleDto {
  year: number;
  month: number;
  shifts: Record<string, string>;
  savedBy?: string | null;
}

@Injectable()
export class SchedulesService {
  private readonly table = 'employee_schedules';
  private readonly entriesTable = 'employee_schedule_entries';

  constructor(private readonly supabaseService: SupabaseService) {}

  async getSchedule(year: number, month: number): Promise<ScheduleRecord | null> {
    const { data, error } = await this.supabaseService.client
      .from(this.table)
      .select('*')
      .eq('year', year)
      .eq('month', month)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return (data as ScheduleRecord) ?? null;
  }

  async saveSchedule(dto: SaveScheduleDto): Promise<ScheduleRecord> {
    if (typeof dto.year !== 'number' || typeof dto.month !== 'number') {
      throw new BadRequestException('year and month are required');
    }

    if (!dto.shifts || typeof dto.shifts !== 'object') {
      throw new BadRequestException('shifts payload is required');
    }

    const payload = {
      year: dto.year,
      month: dto.month,
      shifts: dto.shifts,
      saved_by: dto.savedBy ?? null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabaseService.client
      .from(this.table)
      .upsert(payload, { onConflict: 'year,month' })
      .select('*')
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    await this.persistEntries(dto);

    return data as ScheduleRecord;
  }

  private async persistEntries(dto: SaveScheduleDto): Promise<void> {
    const client = this.supabaseService.client;

    const { error: deleteError } = await client
      .from(this.entriesTable)
      .delete()
      .eq('year', dto.year)
      .eq('month', dto.month);

    if (deleteError) {
      throw new BadRequestException(deleteError.message);
    }

    // UUID validation regex
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    const entries = Object.entries(dto.shifts || {})
      .map(([key, shift]) => {
        if (!shift) return null;
        const [userId, dayString] = key.split('-');
        const day = Number(dayString);
        // Validate UUID format before including
        if (!userId || Number.isNaN(day) || !uuidRegex.test(userId)) {
          return null;
        }
        return {
          user_id: userId,
          year: dto.year,
          month: dto.month,
          day,
          shift,
        };
      })
      .filter((entry): entry is { user_id: string; year: number; month: number; day: number; shift: string } => Boolean(entry));

    if (!entries.length) {
      return;
    }

    const { error: insertError } = await client
      .from(this.entriesTable)
      .insert(entries);

    if (insertError) {
      throw new BadRequestException(insertError.message);
    }
  }
}
