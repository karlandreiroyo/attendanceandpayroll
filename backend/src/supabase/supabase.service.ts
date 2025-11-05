import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config(); // ✅ ensures .env variables load before anything else

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY;

    console.log('Supabase URL:', SUPABASE_URL || 'Missing ❌');
    console.log('Supabase KEY:', SUPABASE_KEY ? '✅ exists' : 'Missing ❌');

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error('Missing Supabase environment variables');
    }

    this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }
}
