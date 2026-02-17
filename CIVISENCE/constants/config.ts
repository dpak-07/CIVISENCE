// API Configuration
export const API_CONFIG = {
    // Change this to your backend URL
    // For local development on physical device, use your computer's IP address
    // For Android emulator, use 10.0.2.2
    // For iOS simulator, use localhost
    BASE_URL: __DEV__
        ? 'http://localhost:8000/api'  // Change to your IP if testing on physical device
        : 'https://your-production-api.com/api',

    TIMEOUT: 30000, // 30 seconds

    // AI Service URL (optional, if calling AI service directly)
    AI_SERVICE_URL: __DEV__
        ? 'http://localhost:8001'
        : 'https://your-production-ai-service.com',
};

// App Constants
export const APP_CONSTANTS = {
    APP_NAME: 'CiviSense',
    APP_VERSION: '1.0.0',

    // Issue Categories
    ISSUE_CATEGORIES: [
        { id: 1, name: 'Pothole', icon: 'car', color: '#EF4444', bg: '#FEE2E2' },
        { id: 2, name: 'Streetlight', icon: 'bulb', color: '#F59E0B', bg: '#FEF3C7' },
        { id: 3, name: 'Garbage', icon: 'trash', color: '#10B981', bg: '#D1FAE5' },
        { id: 4, name: 'Water Leak', icon: 'water', color: '#3B82F6', bg: '#DBEAFE' },
        { id: 5, name: 'Traffic Sign', icon: 'alert', color: '#8B5CF6', bg: '#EDE9FE' },
        { id: 6, name: 'Other', icon: 'help-circle', color: '#6B7280', bg: '#F3F4F6' },
    ],

    // Issue Status
    ISSUE_STATUS: {
        PENDING: 'pending',
        IN_PROGRESS: 'in_progress',
        RESOLVED: 'resolved',
        REJECTED: 'rejected',
    },

    // Priority Levels
    PRIORITY_LEVELS: {
        LOW: 0,
        MEDIUM: 1,
        HIGH: 2,
        CRITICAL: 3,
    },

    // Storage Keys
    STORAGE_KEYS: {
        AUTH_TOKEN: '@civisense_auth_token',
        USER_DATA: '@civisense_user_data',
        REFRESH_TOKEN: '@civisense_refresh_token',
    },
};

export default API_CONFIG;
