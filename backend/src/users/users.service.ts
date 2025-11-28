import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import * as bcrypt from 'bcryptjs';

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
        // Hash password before storing (if not already hashed)
        const userToInsert = { ...user };
        if (userToInsert.password) {
            // Check if password is already hashed (starts with $2a$, $2b$, or $2y$)
            const isHashed = /^\$2[ayb]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(userToInsert.password);
            if (!isHashed) {
                // Hash the password with bcrypt (10 rounds) for new users
                // Old users with plain text passwords will still work via verifyPassword
                userToInsert.password = await bcrypt.hash(userToInsert.password, 10);
            }
            // If already hashed, keep it as is (shouldn't happen for new users, but safe to handle)
        }

        const { data, error } = await this.supabaseService.client
            .from('users') // ✅ remove <User>
            .insert([userToInsert])
            .select('*'); // ✅ ensures Supabase returns the new row

        if (error) throw new Error(error.message);
        if (!data || (data as User[]).length === 0)
            throw new Error('Failed to create user');

        const createdUser = (data as User[])[0];
        
        // Automatically create corresponding employee record for attendance foreign key
        // Only create if user has a user_id (which should always be the case)
        if (createdUser.user_id) {
            try {
                const { error: employeeError } = await this.supabaseService.client
                    .from('employees')
                    .insert([
                        {
                            user_id: createdUser.user_id,
                            first_name: createdUser.first_name || '',
                            last_name: createdUser.last_name || '',
                        },
                    ]);

                if (employeeError) {
                    // Log warning but don't fail user creation
                    console.warn(`Failed to create employee record for user_id ${createdUser.user_id}:`, employeeError.message);
                    // Employee record will be created automatically when attendance is recorded
                } else {
                    console.log(`✅ Created employee record for user_id ${createdUser.user_id}`);
                }
            } catch (err) {
                // Don't fail user creation if employee creation fails
                console.warn('Error creating employee record:', err);
            }
        }

        return createdUser;
    }

    async update(id: number | string, user: Partial<User>): Promise<User> {
        const updatePayload: Record<string, any> = { ...user };
        if (Object.prototype.hasOwnProperty.call(updatePayload, 'phone') && updatePayload.phone === '') {
            updatePayload.phone = null;
        }
        if (Object.prototype.hasOwnProperty.call(updatePayload, 'address') && updatePayload.address === '') {
            updatePayload.address = null;
        }
        // Handle empty fingerprint ID - set to null to clear it
        if (Object.prototype.hasOwnProperty.call(updatePayload, 'finger_template_id') && 
            (updatePayload.finger_template_id === '' || updatePayload.finger_template_id === null || updatePayload.finger_template_id === undefined)) {
            updatePayload.finger_template_id = null;
        }
        // Hash password if it's being updated (and not already hashed)
        if (Object.prototype.hasOwnProperty.call(updatePayload, 'password') && updatePayload.password) {
            // Check if password is already hashed
            const isHashed = /^\$2[ayb]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(updatePayload.password);
            if (!isHashed) {
                // Hash the new password with bcrypt (10 rounds)
                // This will upgrade plain text passwords to hashed when users change their password
                // Old plain text passwords will still work for login until they're changed
                updatePayload.password = await bcrypt.hash(updatePayload.password, 10);
            }
            // If already hashed, keep it as is
        }

        // Users table only has user_id column, not id
        const { data, error } = await this.supabaseService.client
            .from('users')
            .update(updatePayload)
            .eq('user_id', id)
            .select('*');

        if (error) throw new Error(error.message);
        if (!data || (data as User[]).length === 0)
            throw new Error('Failed to update user');

        return (data as User[])[0];
    }

    async delete(id: number | string): Promise<{ deleted: boolean; softDeleted: boolean }> {
        const updatePayload = {
            status: 'Inactive' as const,
        };

        // Users table only has user_id column, not id
        const { data, error } = await this.supabaseService.client
            .from('users')
            .update(updatePayload)
            .eq('user_id', id)
            .select('user_id');

        if (error) throw new Error(error.message || 'Failed to deactivate user');
        if (!data || data.length === 0) throw new Error('User not found');

        return { deleted: true, softDeleted: true };
    }
}
