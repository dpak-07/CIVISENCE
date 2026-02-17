import api, { ApiResponse, handleApiError } from './api';

// Types
export interface Location {
    latitude: number;
    longitude: number;
    address?: string;
}

export interface Issue {
    id: string;
    title: string;
    description: string;
    category: string;
    status: 'pending' | 'in_progress' | 'resolved' | 'rejected';
    priority: number;
    location: Location;
    image_url?: string;
    audio_url?: string;
    reporter_id: string;
    reporter_name?: string;
    upvotes: number;
    duplicate_count?: number;
    assigned_department?: string;
    created_at: string;
    updated_at: string;
    resolved_at?: string;
}

export interface CreateIssueData {
    title: string;
    description: string;
    category: string;
    latitude: number;
    longitude: number;
    address?: string;
    image?: {
        uri: string;
        type: string;
        name: string;
    };
    audio?: {
        uri: string;
        type: string;
        name: string;
    };
}

export interface IssueFilters {
    status?: string;
    category?: string;
    priority?: number;
    search?: string;
    page?: number;
    limit?: number;
}

export interface IssuesListResponse {
    issues: Issue[];
    total: number;
    page: number;
    pages: number;
}

// Issues Service
class IssuesService {
    /**
     * Create a new issue
     */
    async createIssue(data: CreateIssueData): Promise<Issue> {
        try {
            const formData = new FormData();

            formData.append('title', data.title);
            formData.append('description', data.description);
            formData.append('category', data.category);
            formData.append('latitude', data.latitude.toString());
            formData.append('longitude', data.longitude.toString());

            if (data.address) {
                formData.append('address', data.address);
            }

            // Add image if provided
            if (data.image) {
                formData.append('image', {
                    uri: data.image.uri,
                    type: data.image.type,
                    name: data.image.name,
                } as any);
            }

            // Add audio if provided
            if (data.audio) {
                formData.append('audio', {
                    uri: data.audio.uri,
                    type: data.audio.type,
                    name: data.audio.name,
                } as any);
            }

            const response = await api.post<Issue>('/issues', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    }

    /**
     * Get all issues with filters
     */
    async getIssues(filters?: IssueFilters): Promise<IssuesListResponse> {
        try {
            const params = new URLSearchParams();

            if (filters?.status) params.append('status', filters.status);
            if (filters?.category) params.append('category', filters.category);
            if (filters?.priority !== undefined) params.append('priority', filters.priority.toString());
            if (filters?.search) params.append('search', filters.search);
            if (filters?.page) params.append('page', filters.page.toString());
            if (filters?.limit) params.append('limit', filters.limit.toString());

            const response = await api.get<IssuesListResponse>(`/issues?${params.toString()}`);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    }

    /**
     * Get a single issue by ID
     */
    async getIssueById(id: string): Promise<Issue> {
        try {
            const response = await api.get<Issue>(`/issues/${id}`);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    }

    /**
     * Get issues reported by current user
     */
    async getMyIssues(): Promise<Issue[]> {
        try {
            const response = await api.get<Issue[]>('/issues/my-issues');
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    }

    /**
     * Upvote an issue
     */
    async upvoteIssue(id: string): Promise<Issue> {
        try {
            const response = await api.post<Issue>(`/issues/${id}/upvote`);
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    }

    /**
     * Get nearby issues
     */
    async getNearbyIssues(latitude: number, longitude: number, radius: number = 5): Promise<Issue[]> {
        try {
            const response = await api.get<Issue[]>('/issues/nearby', {
                params: { latitude, longitude, radius },
            });
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    }

    /**
     * Get issue statistics
     */
    async getStatistics(): Promise<{
        total: number;
        pending: number;
        in_progress: number;
        resolved: number;
        rejected: number;
    }> {
        try {
            const response = await api.get('/issues/statistics');
            return response.data;
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    }

    /**
     * Delete an issue (only if user is the reporter)
     */
    async deleteIssue(id: string): Promise<void> {
        try {
            await api.delete(`/issues/${id}`);
        } catch (error) {
            throw new Error(handleApiError(error));
        }
    }
}

export default new IssuesService();
