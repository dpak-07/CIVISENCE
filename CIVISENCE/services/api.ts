import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, APP_CONSTANTS } from '../constants/config';

// Create axios instance
const api: AxiosInstance = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    timeout: API_CONFIG.TIMEOUT,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        const token = await AsyncStorage.getItem(APP_CONSTANTS.STORAGE_KEYS.AUTH_TOKEN);
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error: AxiosError) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        if (error.response?.status === 401) {
            // Token expired or invalid, clear storage and redirect to login
            await AsyncStorage.multiRemove([
                APP_CONSTANTS.STORAGE_KEYS.AUTH_TOKEN,
                APP_CONSTANTS.STORAGE_KEYS.USER_DATA,
                APP_CONSTANTS.STORAGE_KEYS.REFRESH_TOKEN,
            ]);
            // You can add navigation to login screen here if needed
        }
        return Promise.reject(error);
    }
);

// API response types
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

// Error handler
export const handleApiError = (error: any): string => {
    if (error.response) {
        // Server responded with error
        return error.response.data?.message || error.response.data?.detail || 'Server error occurred';
    } else if (error.request) {
        // Request made but no response
        return 'No response from server. Please check your internet connection.';
    } else {
        // Something else happened
        return error.message || 'An unexpected error occurred';
    }
};

export default api;
