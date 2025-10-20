import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface User { // ✅ Export it so controller can import
    id?: number;
    username: string;
    password: string;
    role: string;
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

    async update(id: number, user: Partial<User>): Promise<User> {
        const { data, error } = await this.supabaseService.client
            .from('users') // ✅ remove <User>
            .update(user)
            .eq('id', id)
            .select('*'); // ✅ needed for updated row

        if (error) throw new Error(error.message);
        if (!data || (data as User[]).length === 0)
            throw new Error('Failed to update user');

        return (data as User[])[0];
    }

    async delete(id: number): Promise<{ deleted: boolean }> {
        const { error } = await this.supabaseService.client
            .from('users') // ✅ remove <User>
            .delete()
            .eq('id', id);

        if (error) throw new Error(error.message);
        return { deleted: true };
    }
}
