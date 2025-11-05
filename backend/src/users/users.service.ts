import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class UsersService {
    private supabase: SupabaseClient;

    constructor() {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_KEY;

        console.log('DEBUG: SUPABASE_URL =', url);
        console.log('DEBUG: SUPABASE_KEY =', key ? '✅ exists' : '❌ missing');

        if (!url || !key) {
            throw new Error(
                '❌ Missing Supabase credentials. Please check your .env file for SUPABASE_URL and SUPABASE_KEY.'
            );
        }

        this.supabase = createClient(url, key);
    }

    // ✅ CREATE
    async create(dto: CreateEmployeeDto) {
        const { data, error } = await this.supabase.from('users').insert([dto]).select();
        if (error) throw new Error(error.message);
        return data[0];
    }

    // ✅ READ ALL
    async findAll() {
        const { data, error } = await this.supabase.from('users').select('*');
        if (error) throw new Error(error.message);
        return data;
    }

    // ✅ READ ONE
    async findOne(id: string) {
        const { data, error } = await this.supabase
            .from('users')
            .select('*')
            .eq('user_id', id)
            .single();
        if (error) throw new Error(error.message);
        return data;
    }

    // ✅ UPDATE
    async update(id: string, dto: UpdateEmployeeDto) {
        const { data, error } = await this.supabase
            .from('users')
            .update(dto)
            .eq('user_id', id)
            .select();
        if (error) throw new Error(error.message);
        return data[0];
    }

    // ✅ DELETE
    async remove(id: string) {
        const { error } = await this.supabase.from('users').delete().eq('user_id', id);
        if (error) throw new Error(error.message);
        return { message: 'User deleted successfully' };
    }
}
