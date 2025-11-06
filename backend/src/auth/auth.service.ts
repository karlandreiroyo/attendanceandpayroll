import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class AuthService {
  private supabase: SupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_KEY!;
    if (!url || !key) throw new Error('Missing Supabase credentials');
    this.supabase = createClient(url, key);
  }

  async login(username: string, password: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single();

    if (error || !data) {
      throw new UnauthorizedException('Invalid username or password');
    }

    // ✅ Ensure the "role" column exists in your Supabase "users" table
    //    (values should be 'admin' or 'employee')
    return {
      success: true,
      message: 'Login successful',
      user: {
        id: data.id,
        username: data.username,
        role: data.role || 'employee',
      },
    };
  }
}
