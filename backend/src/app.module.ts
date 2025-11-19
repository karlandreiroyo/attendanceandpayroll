import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { LeaveRequestsModule } from './leave-requests/leave-requests.module';
import { SchedulesModule } from './schedules/schedules.module';
import { PayrollModule } from './payroll/payroll.module';
import { ReportsModule } from './reports/reports.module';
import { EmployeeDashboardModule } from './employee-dashboard/employee-dashboard.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { FingerprintModule } from './fingerprint/fingerprint.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    UsersModule,
    AuthModule,
    LeaveRequestsModule,
    SchedulesModule,
    PayrollModule,
    ReportsModule,
    EmployeeDashboardModule,
    AnnouncementsModule,
    FingerprintModule,
  ],
})
export class AppModule {}
