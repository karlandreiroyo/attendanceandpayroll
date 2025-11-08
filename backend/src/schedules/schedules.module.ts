import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';

@Module({
  imports: [SupabaseModule],
  providers: [SchedulesService],
  controllers: [SchedulesController],
})
export class SchedulesModule {}
