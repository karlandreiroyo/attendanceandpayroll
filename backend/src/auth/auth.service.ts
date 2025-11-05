// auth.service.ts
import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AuthService {
  constructor(private readonly supabaseService: SupabaseService) { }

  async login(username: string, password: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('users')
      .select('*')
      .eq('username', username) // ✅ only fetch where username matches
      .single(); // ✅ expect only one record

    if (error || !data) {
      throw new Error('User not found');
    }

    // Compare password (no hashing yet)
    if (data.password !== password) {
      throw new Error('Invalid password');
    }

    // Check if account is active
    if (data.status !== 'Active') {
      throw new Error('Account is inactive');
    }

    // Successful login
    return {
      success: true,
      message: 'Login successful',
      user: {
        id: data.user_id,
        username: data.username,
        role: data.role || 'employee',
        first_name: data.first_name,
        last_name: data.last_name,
        department: data.department,
      },
    };
  }
}
