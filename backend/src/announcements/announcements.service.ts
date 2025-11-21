import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

type AnnouncementRecord = {
  id: string;
  title: string;
  body?: string | null;
  audience?: string | null;
  published_at: string;
};

interface FindAllOptions {
  audience?: string;
  limit?: number;
}

@Injectable()
export class AnnouncementsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll(options: FindAllOptions = {}) {
    let query = this.supabaseService.client
      .from('announcements')
      .select('id,title,body,audience,published_at')
      .order('published_at', { ascending: false });

    if (options.audience) {
      query = query.or(`audience.is.null,audience.eq.${options.audience}`);
    }

    if (options.limit && Number.isFinite(options.limit)) {
      query = query.limit(Math.max(1, Math.min(options.limit, 50)));
    }

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(error.message);
    }

    return ((data as AnnouncementRecord[]) ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      body: item.body ?? '',
      audience: item.audience ?? null,
      publishedAt: item.published_at,
    }));
  }

  async create(input: CreateAnnouncementDto) {
    const payload = {
      title: input.title.trim(),
      body: input.body?.trim() || null,
      audience: input.audience?.trim() || null,
    };

    const { data, error } = await this.supabaseService.client
      .from('announcements')
      .insert([payload])
      .select('id,title,body,audience,published_at')
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      id: data.id,
      title: data.title,
      body: data.body ?? '',
      audience: data.audience ?? null,
      publishedAt: data.published_at,
    };
  }

  async delete(id: string) {
    const { error } = await this.supabaseService.client
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { deleted: true };
  }
}

