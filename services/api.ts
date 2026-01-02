import { UserRole, User, PatientProfile, Treatment } from '../types';

const rawApiUrl = import.meta.env.VITE_API_URL || 'https://aytsam.onrender.com/api';
const API_BASE_URL = rawApiUrl.replace(/\/$/, '');

// Types for API responses
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}

export interface SignupRequest {
  cnic: string;
  name?: string;
  email: string;
  password: string;
  role?: string;
}

export interface SignupResponse {
  user: {
    id: string;
    email: string;
    cnic: string;
    isVerified: boolean;
  };
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface VerifyOtpResponse {
  user: {
    id: string;
    email: string;
    cnic: string;
    isVerified: boolean;
    role: string;
  };
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  role?: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    cnic?: string;
    isVerified: boolean;
    role: string;
  };
  token: string;
}

export interface UserProfile {
  id: string;
  role: string;
  name: string;
  email: string;
  cnic?: string;
  isVerified: boolean;
}

// Utility function to handle API responses
async function handleApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'An error occurred');
  }

  return data;
}

// Generic API request function
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;

  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true', // Bypass ngrok warning
      ...options.headers,
    },
    ...options,
  };

  // Add auth token if available
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  try {
    const response = await fetch(url, config);
    return await handleApiResponse<T>(response);
  } catch (error) {
    console.error('API Request failed:', error);
    throw error;
  }
}

// Authentication API functions
export const authApi = {
  // Signup - initiates OTP flow
  signup: async (data: SignupRequest): Promise<ApiResponse<SignupResponse>> => {
    return apiRequest<SignupResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Verify OTP and complete signup
  verifyOtp: async (data: VerifyOtpRequest): Promise<ApiResponse<VerifyOtpResponse>> => {
    return apiRequest<VerifyOtpResponse>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Resend OTP
  resendOtp: async (email: string): Promise<ApiResponse> => {
    return apiRequest('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  // Login
  login: async (data: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
    return apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get user profile
  getProfile: async (): Promise<ApiResponse<{ user: UserProfile }>> => {
    return apiRequest<{ user: UserProfile }>('/auth/profile');
  },

  // Get all patients (Doctor only)
  getPatients: async (): Promise<ApiResponse<{ patients: PatientProfile[] }>> => {
    return apiRequest<{ patients: PatientProfile[] }>('/auth/patients');
  },

  // Add Treatment
  addTreatment: async (data: any): Promise<ApiResponse<any>> => {
    return apiRequest('/auth/treatments', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Delete Treatment
  deleteTreatment: async (id: string): Promise<ApiResponse<any>> => {
    return apiRequest(`/auth/treatments/${id}`, {
      method: 'DELETE'
    });
  }
};

// Utility functions
export const authUtils = {
  // Store auth token
  setToken: (token: string) => {
    localStorage.setItem('authToken', token);
  },

  // Get auth token
  getToken: (): string | null => {
    return localStorage.getItem('authToken');
  },

  // Remove auth token
  removeToken: () => {
    localStorage.removeItem('authToken');
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    return !!authUtils.getToken();
  },

  // Logout
  logout: () => {
    authUtils.removeToken();
  },
};

// Health check
export const healthCheck = async (): Promise<boolean> => {
  try {
    // We need to check the base URL, but removing '/api' if it's there might be tricky 
    // depending on how API_BASE_URL is set. 
    // If API_BASE_URL is http://locahost:5000/api, we want http://localhost:5000/health
    // For now, let's try to construct it relative to the API_BASE_URL or fallback to localhost

    let healthUrl = 'http://localhost:5000/health';

    if (API_BASE_URL.includes('/api')) {
      healthUrl = API_BASE_URL.replace('/api', '/health');
    } else {
      // If it doesn't have /api, maybe it is the root? just append /health
      healthUrl = `${API_BASE_URL}/health`;
    }

    const response = await fetch(healthUrl, {
      headers: {
        'ngrok-skip-browser-warning': 'true'
      }
    });
    return response.ok;
  } catch {
    return false;
  }
};
