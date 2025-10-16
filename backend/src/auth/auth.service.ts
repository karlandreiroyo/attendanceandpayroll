import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  async login(username: string, password: string, role: string) {
    console.log('🟢 Validating user:', username, password, role);


    if (role === 'employee' && username === 'employee1' && password === '1234') {
      return { success: true, role: 'employee', message: 'Employee login successful' };
    }

    if (role === 'admin' && username === 'admin@tatayilio.com' && password === 'admin123') {
      return { success: true, role: 'admin', message: 'Admin login successful' };
    }

    return { success: false, message: 'Invalid username or password' };
  }
}
