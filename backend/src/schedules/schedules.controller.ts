import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import type { SaveScheduleDto } from './schedules.service';

@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) { }

  @Get()
  async getSchedule(
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    if (!year || !month) {
      throw new BadRequestException(
        'year and month query parameters are required',
      );
    }

    const yearNum = Number(year);
    const monthNum = Number(month);

    if (Number.isNaN(yearNum) || Number.isNaN(monthNum)) {
      throw new BadRequestException('year and month must be numbers');
    }

    const schedule = await this.schedulesService.getSchedule(yearNum, monthNum);
    return schedule ?? { year: yearNum, month: monthNum, shifts: {} };
  }

  @Post()
  async saveSchedule(@Body() body: SaveScheduleDto) {
    return this.schedulesService.saveSchedule(body);
  }
}
