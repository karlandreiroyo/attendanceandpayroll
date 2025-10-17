import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SupabaseService {
  public client: SupabaseClient;

  constructor(private configService: ConfigService) {
    const url = this.configService.get<string>('SUPABASE_URL');
    const key = this.configService.get<string>('SUPABASE_SERVICE_KEY');

    console.log('Supabase URL:', url);
    console.log('Supabase KEY:', key ? 'Loaded ✅' : 'Missing ❌');


    if (!url || !key) {
      throw new Error('Missing Supabase environment variables');
    }

    this.client = createClient(url, key);
  }
}
