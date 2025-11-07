import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AuthService {
  constructor(private readonly supabaseService: SupabaseService) { }

  // auth.service.ts
  async login(username: string, password: string) {
    const { data, error } = await this.supabaseService.client
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !data) {
      throw new Error('User not found');
    }

    if (data.password !== password) {
      throw new Error('Invalid password');
    }

    return {
      success: true,              // <-- for frontend checks
      message: 'Login successful',
      user: {
        id: data.user_id ?? data.id,
        username: data.username,
        role: data.role || 'employee', // default to employee if role missing
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        department: data.department,
        position: data.position,
        profile_picture: data.profile_picture,
      },
    };
  }

}
