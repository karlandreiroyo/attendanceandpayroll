import { Injectable } from '@nestjs/common';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class UsersService {
    private users: User[] = [
        {
            id: 1,
            email: 'admin@gmail.com',
            password: 'admin123', // later: hash this
            role: 'admin',
        },
        {
            id: 2,
            email: 'employee@gmail.com',
            password: 'emp123',
            role: 'employee',
        },
    ];

    findByEmail(email: string): User | undefined {
        return this.users.find((user) => user.email === email);
    }
}
