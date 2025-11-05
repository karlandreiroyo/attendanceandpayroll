import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

export interface User {
    id?: string;
    name: string;
    email: string;
    role?: string; // optional to match DTO
}

@Injectable()
export class UsersService {
    private supabase: SupabaseClient;

    constructor() {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_KEY;

        console.log('DEBUG: SUPABASE_URL =', process.env.SUPABASE_URL);
        console.log('DEBUG: SUPABASE_KEY =', process.env.SUPABASE_KEY ? '✅ exists' : '❌ missing');

        // ✅ Validate environment variables before using them
        if (!url || !key) {
            throw new Error(
                'Supabase credentials are missing. Please check your .env file for SUPABASE_URL and SUPABASE_KEY.',
            );
        }

        // ✅ Create Supabase client safely
        this.supabase = createClient(url, key);
    }

    async create(dto: CreateEmployeeDto) {
        const { data, error } = await this.supabase.from('users').insert([dto]);
        if (error) throw new Error(error.message);
        return data;
    }

    async findAll() {
        const { data, error } = await this.supabase.from('users').select('*');
        if (error) throw new Error(error.message);
        return data;
    }

    async findOne(id: string) {
        const { data, error } = await this.supabase.from('users').select('*').eq('id', id).single();
        if (error) throw new Error(error.message);
        return data;
    }

    async update(id: string, dto: UpdateEmployeeDto) {
        const { data, error } = await this.supabase.from('users').update(dto).eq('id', id);
        if (error) throw new Error(error.message);
        return data;
    }

    async remove(id: string) {
        const { data, error } = await this.supabase.from('users').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return data;
    }
}
