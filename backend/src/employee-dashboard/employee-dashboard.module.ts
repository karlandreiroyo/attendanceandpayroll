import { Module } from '@nestjs/common';
import { EmployeeDashboardController } from './employee-dashboard.controller';
import { EmployeeDashboardService } from './employee-dashboard.service';
import { LeaveRequestsModule } from '../leave-requests/leave-requests.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { AnnouncementsModule } from '../announcements/announcements.module';

@Module({
  imports: [LeaveRequestsModule, SupabaseModule, AnnouncementsModule],
  controllers: [EmployeeDashboardController],
  providers: [EmployeeDashboardService],
})
export class EmployeeDashboardModule {}


