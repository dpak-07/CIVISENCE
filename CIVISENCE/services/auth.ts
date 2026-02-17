import api, { ApiResponse, handleApiError } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_CONSTANTS } from '../constants/config';

// Types
export interface User {
    id: string;
    email: string;
    full_name: string;
    phone_number?: string;
    role: string;
    created_at: string;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    email: string;
    password: string;
    full_name: string;
    phone_number?: string;
}

export interface AuthResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
    user: User;
}

// Authentication Service
class AuthService {
    /**
     * Login user
     */
    async login(credentials: LoginCredentials): Promise<AuthResponse> {
        try {
            const formData = new FormData();
            formData.append('username', credentials.email);
            formData.append('password', credentials.password);

            const response = await api.post<AuthResponse>('/auth/login', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            // Store tokens and user data
            await this.storeAuthData(response.data);

            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    }

    /**
     * Register new user
     */
    async register(data: RegisterData): Promise<AuthResponse> {
        try {
            const response = await api.post<AuthResponse>('/auth/register', data);

            // Store tokens and user data
            await this.storeAuthData(response.data);

            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    }

    /**
     * Logout user
     */
    async logout(): Promise<void> {
        try {
            // Call logout endpoint (optional, depending on your backend)
            await api.post('/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Clear local storage
            await this.clearAuthData();
        }
    }

    /**
     * Get current user profile
     */
    async getCurrentUser(): Promise<User> {
        try {
            const response = await api.get<User>('/auth/me');
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    }

    /**
     * Update user profile
     */
    async updateProfile(data: Partial<User>): Promise<User> {
        try {
            const response = await api.put<User>('/auth/me', data);

            // Update stored user data
            await AsyncStorage.setItem(
                APP_CONSTANTS.STORAGE_KEYS.USER_DATA,
                JSON.stringify(response.data)
            );

            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    }

    /**
     * Refresh access token
     */
    async refreshToken(): Promise<string> {
        try {
            const refreshToken = await AsyncStorage.getItem(
                APP_CONSTANTS.STORAGE_KEYS.REFRESH_TOKEN
            );

            if (!refreshToken) {
                throw new Error('No refresh token available');
            }

            const response = await api.post<{ access_token: string }>('/auth/refresh', {
                refresh_token: refreshToken,
            });

            // Store new access token
            await AsyncStorage.setItem(
                APP_CONSTANTS.STORAGE_KEYS.AUTH_TOKEN,
                response.data.access_token
            );

            return response.data.access_token;
        } catch (error) {
            // If refresh fails, clear auth data
            await this.clearAuthData();
            throw new Error(handleApiError(error));
        }
    }

    /**
     * Check if user is authenticated
     */
    async isAuthenticated(): Promise<boolean> {
        const token = await AsyncStorage.getItem(APP_CONSTANTS.STORAGE_KEYS.AUTH_TOKEN);
        return !!token;
    }

    /**
     * Get stored user data
     */
    async getStoredUser(): Promise<User | null> {
        try {
            const userData = await AsyncStorage.getItem(APP_CONSTANTS.STORAGE_KEYS.USER_DATA);
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Store authentication data
     */
    private async storeAuthData(authData: AuthResponse): Promise<void> {
        await AsyncStorage.multiSet([
            [APP_CONSTANTS.STORAGE_KEYS.AUTH_TOKEN, authData.access_token],
            [APP_CONSTANTS.STORAGE_KEYS.REFRESH_TOKEN, authData.refresh_token],
            [APP_CONSTANTS.STORAGE_KEYS.USER_DATA, JSON.stringify(authData.user)],
        ]);
    }

    /**
     * Clear authentication data
     */
    private async clearAuthData(): Promise<void> {
        await AsyncStorage.multiRemove([
            APP_CONSTANTS.STORAGE_KEYS.AUTH_TOKEN,
            APP_CONSTANTS.STORAGE_KEYS.USER_DATA,
            APP_CONSTANTS.STORAGE_KEYS.REFRESH_TOKEN,
        ]);
    }
}

export default new AuthService();
