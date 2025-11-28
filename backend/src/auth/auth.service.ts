import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(private readonly supabaseService: SupabaseService) { }

  /**
   * Verify password - supports both hashed and plain text passwords (for migration)
   * This ensures old plain text passwords still work while new passwords are hashed
   */
  private async verifyPassword(plainPassword: string, storedPassword: string): Promise<boolean> {
    if (!storedPassword || !plainPassword) {
      return false;
    }

    // Check if stored password is a bcrypt hash (starts with $2a$, $2b$, or $2y$)
    // Bcrypt hashes always start with $2a$, $2b$, or $2y$ followed by cost, salt, and hash
    const isHashed = /^\$2[ayb]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(storedPassword);
    
    if (isHashed) {
      // Password is hashed, use bcrypt to compare
      try {
        return await bcrypt.compare(plainPassword, storedPassword);
      } catch (error) {
        console.error('Error comparing hashed password:', error);
        return false;
      }
    } else {
      // Password is plain text (legacy), do direct comparison
      // This supports old passwords that weren't hashed before Supabase hashing was enabled
      // IMPORTANT: This allows old plain text passwords to still work
      return plainPassword === storedPassword;
    }
  }

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

    if ((data.status && data.status !== 'Active')) {
      throw new Error('This account has been deactivated. Please contact an administrator.');
    }

    // Use password verification that supports both hashed and plain text
    const isPasswordValid = await this.verifyPassword(password, data.password);
    if (!isPasswordValid) {
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
