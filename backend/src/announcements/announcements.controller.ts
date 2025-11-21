import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get()
  async findAll(@Query('audience') audience?: string, @Query('limit') limit?: string) {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    return this.announcementsService.findAll({
      audience: audience ? String(audience) : undefined,
      limit: Number.isNaN(parsedLimit) ? undefined : parsedLimit,
    });
  }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async create(@Body() body: CreateAnnouncementDto) {
    if (!body.title?.trim()) {
      throw new BadRequestException('Title is required');
    }
    return this.announcementsService.create(body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('Announcement id is required');
    }
    return this.announcementsService.delete(id);
  }
}

