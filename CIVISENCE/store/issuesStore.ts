import { create } from 'zustand';
import issuesService, { Issue, IssueFilters, CreateIssueData } from '../services/issues';

interface IssuesState {
    issues: Issue[];
    myIssues: Issue[];
    currentIssue: Issue | null;
    isLoading: boolean;
    error: string | null;
    total: number;
    page: number;
    pages: number;

    // Statistics
    statistics: {
        total: number;
        pending: number;
        in_progress: number;
        resolved: number;
        rejected: number;
    } | null;

    // Actions
    fetchIssues: (filters?: IssueFilters) => Promise<void>;
    fetchMyIssues: () => Promise<void>;
    fetchIssueById: (id: string) => Promise<void>;
    createIssue: (data: CreateIssueData) => Promise<Issue>;
    upvoteIssue: (id: string) => Promise<void>;
    fetchNearbyIssues: (latitude: number, longitude: number, radius?: number) => Promise<void>;
    fetchStatistics: () => Promise<void>;
    deleteIssue: (id: string) => Promise<void>;
    clearError: () => void;
    clearCurrentIssue: () => void;
}

export const useIssuesStore = create<IssuesState>((set, get) => ({
    issues: [],
    myIssues: [],
    currentIssue: null,
    isLoading: false,
    error: null,
    total: 0,
    page: 1,
    pages: 1,
    statistics: null,

    fetchIssues: async (filters?: IssueFilters) => {
        set({ isLoading: true, error: null });
        try {
            const response = await issuesService.getIssues(filters);
            set({
                issues: response.issues,
                total: response.total,
                page: response.page,
                pages: response.pages,
                isLoading: false,
            });
        } catch (error: any) {
            set({
                error: error.message || 'Failed to fetch issues',
                isLoading: false,
            });
        }
    },

    fetchMyIssues: async () => {
        set({ isLoading: true, error: null });
        try {
            const myIssues = await issuesService.getMyIssues();
            set({
                myIssues,
                isLoading: false,
            });
        } catch (error: any) {
            set({
                error: error.message || 'Failed to fetch your issues',
                isLoading: false,
            });
        }
    },

    fetchIssueById: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
            const issue = await issuesService.getIssueById(id);
            set({
                currentIssue: issue,
                isLoading: false,
            });
        } catch (error: any) {
            set({
                error: error.message || 'Failed to fetch issue details',
                isLoading: false,
            });
        }
    },

    createIssue: async (data: CreateIssueData) => {
        set({ isLoading: true, error: null });
        try {
            const newIssue = await issuesService.createIssue(data);
            set((state) => ({
                issues: [newIssue, ...state.issues],
                myIssues: [newIssue, ...state.myIssues],
                isLoading: false,
            }));
            return newIssue;
        } catch (error: any) {
            set({
                error: error.message || 'Failed to create issue',
                isLoading: false,
            });
            throw error;
        }
    },

    upvoteIssue: async (id: string) => {
        try {
            const updatedIssue = await issuesService.upvoteIssue(id);
            set((state) => ({
                issues: state.issues.map((issue) =>
                    issue.id === id ? updatedIssue : issue
                ),
                currentIssue: state.currentIssue?.id === id ? updatedIssue : state.currentIssue,
            }));
        } catch (error: any) {
            set({
                error: error.message || 'Failed to upvote issue',
            });
        }
    },

    fetchNearbyIssues: async (latitude: number, longitude: number, radius?: number) => {
        set({ isLoading: true, error: null });
        try {
            const nearbyIssues = await issuesService.getNearbyIssues(latitude, longitude, radius);
            set({
                issues: nearbyIssues,
                isLoading: false,
            });
        } catch (error: any) {
            set({
                error: error.message || 'Failed to fetch nearby issues',
                isLoading: false,
            });
        }
    },

    fetchStatistics: async () => {
        try {
            const stats = await issuesService.getStatistics();
            set({ statistics: stats });
        } catch (error: any) {
            set({
                error: error.message || 'Failed to fetch statistics',
            });
        }
    },

    deleteIssue: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
            await issuesService.deleteIssue(id);
            set((state) => ({
                issues: state.issues.filter((issue) => issue.id !== id),
                myIssues: state.myIssues.filter((issue) => issue.id !== id),
                isLoading: false,
            }));
        } catch (error: any) {
            set({
                error: error.message || 'Failed to delete issue',
                isLoading: false,
            });
            throw error;
        }
    },

    clearError: () => set({ error: null }),

    clearCurrentIssue: () => set({ currentIssue: null }),
}));
