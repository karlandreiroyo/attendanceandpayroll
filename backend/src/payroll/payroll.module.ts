import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';

@Module({
  imports: [SupabaseModule],
  providers: [PayrollService],
  controllers: [PayrollController],
})
export class PayrollModule {}
