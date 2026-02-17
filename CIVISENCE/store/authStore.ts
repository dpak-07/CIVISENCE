import { create } from 'zustand';
import authService, { User } from '../services/auth';

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    // Actions
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, fullName: string, phoneNumber?: string) => Promise<void>;
    logout: () => Promise<void>;
    loadUser: () => Promise<void>;
    updateProfile: (data: Partial<User>) => Promise<void>;
    clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,

    login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
            const response = await authService.login({ email, password });
            set({
                user: response.user,
                isAuthenticated: true,
                isLoading: false,
                error: null,
            });
        } catch (error: any) {
            set({
                error: error.message || 'Login failed',
                isLoading: false,
                isAuthenticated: false,
            });
            throw error;
        }
    },

    register: async (email: string, password: string, fullName: string, phoneNumber?: string) => {
        set({ isLoading: true, error: null });
        try {
            const response = await authService.register({
                email,
                password,
                full_name: fullName,
                phone_number: phoneNumber,
            });
            set({
                user: response.user,
                isAuthenticated: true,
                isLoading: false,
                error: null,
            });
        } catch (error: any) {
            set({
                error: error.message || 'Registration failed',
                isLoading: false,
                isAuthenticated: false,
            });
            throw error;
        }
    },

    logout: async () => {
        set({ isLoading: true });
        try {
            await authService.logout();
            set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: null,
            });
        } catch (error: any) {
            set({
                error: error.message || 'Logout failed',
                isLoading: false,
            });
        }
    },

    loadUser: async () => {
        set({ isLoading: true });
        try {
            const isAuth = await authService.isAuthenticated();
            if (isAuth) {
                const user = await authService.getStoredUser();
                if (user) {
                    set({
                        user,
                        isAuthenticated: true,
                        isLoading: false,
                    });
                    return;
                }
            }
            set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
            });
        } catch (error) {
            set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
            });
        }
    },

    updateProfile: async (data: Partial<User>) => {
        set({ isLoading: true, error: null });
        try {
            const updatedUser = await authService.updateProfile(data);
            set({
                user: updatedUser,
                isLoading: false,
                error: null,
            });
        } catch (error: any) {
            set({
                error: error.message || 'Profile update failed',
                isLoading: false,
            });
            throw error;
        }
    },

    clearError: () => set({ error: null }),
}));
