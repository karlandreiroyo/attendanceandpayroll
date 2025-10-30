import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface User { // ✅ Export it so controller can import
    id?: number;
    username: string;
    password: string;
    role: string;
    full_name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    department?: string;
    position?: string;
    status?: 'Active' | 'Inactive';
    join_date?: string;
    phone?: string;
    address?: string;
}

@Injectable()
export class UsersService {
    constructor(private readonly supabaseService: SupabaseService) { }

    async findAll(): Promise<User[]> {
        const { data, error } = await this.supabaseService.client
            .from('users') // ✅ remove <User>
            .select('*');

        if (error) throw new Error(error.message);
        return (data as User[]) ?? [];
    }

    async create(user: User): Promise<User> {
        const { data, error } = await this.supabaseService.client
            .from('users') // ✅ remove <User>
            .insert([user])
            .select('*'); // ✅ ensures Supabase returns the new row

        if (error) throw new Error(error.message);
        if (!data || (data as User[]).length === 0)
            throw new Error('Failed to create user');

        return (data as User[])[0];
    }

    async update(id: number | string, user: Partial<User>): Promise<User> {
        // Use user_id as the primary key column name
        const { data, error } = await this.supabaseService.client
            .from('users')
            .update(user)
            .eq('user_id', id)
            .select('*');

        if (error) throw new Error(error.message);
        if (!data || (data as User[]).length === 0)
            throw new Error('Failed to update user');

        return (data as User[])[0];
    }

    async delete(id: number | string): Promise<{ deleted: boolean }> {
        // Use user_id as the primary key column name
        const { error } = await this.supabaseService.client
            .from('users')
            .delete()
            .eq('user_id', id);

        if (error) throw new Error(error.message);
        return { deleted: true };
    }
}
