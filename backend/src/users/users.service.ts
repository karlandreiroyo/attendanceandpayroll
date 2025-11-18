import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface User { // ✅ Export it so controller can import
    user_id?: number;
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
    profile_picture?: string;
}

@Injectable()
export class UsersService {
    constructor(private readonly supabaseService: SupabaseService) { }

    async findByUsername(username: string): Promise<User | null> {
        const { data, error } = await this.supabaseService.client
            .from('users')
            .select('*')
            .eq('username', username)
            .maybeSingle();

        if (error) throw new Error(error.message);
        return (data as User) ?? null;
    }

    async findAll(includeInactive = false): Promise<User[]> {
        const query = this.supabaseService.client
            .from('users')
            .select('*');

        if (!includeInactive) {
            query.eq('status', 'Active');
        }

        const { data, error } = await query;

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
        const updatePayload: Record<string, any> = { ...user };
        if (Object.prototype.hasOwnProperty.call(updatePayload, 'phone') && updatePayload.phone === '') {
            updatePayload.phone = null;
        }
        if (Object.prototype.hasOwnProperty.call(updatePayload, 'address') && updatePayload.address === '') {
            updatePayload.address = null;
        }

        let { data, error } = await this.supabaseService.client
            .from('users')
            .update(updatePayload)
            .eq('user_id', id)
            .select('*');

        if (!error && (!data || (data as User[]).length === 0)) {
            const { data: dataById, error: errorById } = await this.supabaseService.client
                .from('users')
                .update(updatePayload)
                .eq('id', id)
                .select('*');

            data = dataById;
            error = errorById;
        }

        if (error) throw new Error(error.message);
        if (!data || (data as User[]).length === 0)
            throw new Error('Failed to update user');

        return (data as User[])[0];
    }

    async delete(id: number | string): Promise<{ deleted: boolean; softDeleted: boolean }> {
        const updatePayload = {
            status: 'Inactive' as const,
        };

        let { data, error } = await this.supabaseService.client
            .from('users')
            .update(updatePayload)
            .eq('user_id', id)
            .select('user_id');

        if (!error && (!data || data.length === 0)) {
            const responseById = await this.supabaseService.client
                .from('users')
                .update(updatePayload)
                .eq('id', id)
                .select('user_id');
            data = responseById.data;
            error = responseById.error;
        }

        if (error) throw new Error(error.message || 'Failed to deactivate user');
        if (!data || data.length === 0) throw new Error('User not found');

        return { deleted: true, softDeleted: true };
    }
}
