
import { User, UserRole } from '../types';

const USERS_KEY = 'dentist_care_users';
const SESSION_KEY = 'dentist_care_session';

export const authService = {
  getUsers: (): User[] => {
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
  },

  signup: (name: string, role: UserRole, password: string): boolean => {
    const users = authService.getUsers();
    if (users.some(u => u.name === name)) {
      return false; // 이미 존재하는 이름
    }
    
    const newUser: User = {
      id: crypto.randomUUID(),
      name,
      role,
      password
    };
    
    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return true;
  },

  login: (name: string, password: string): User | null => {
    const users = authService.getUsers();
    const user = users.find(u => u.name === name && u.password === password);
    
    if (user) {
      const sessionUser = { ...user };
      delete sessionUser.password;
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
      return sessionUser;
    }
    return null;
  },

  logout: () => {
    localStorage.removeItem(SESSION_KEY);
  },

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  }
};
