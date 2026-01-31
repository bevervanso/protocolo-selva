// ============================================
// API SERVICE - Comunicação com Backend
// ============================================

// Detecta automaticamente se está em produção ou desenvolvimento
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
const API_BASE_URL = isProduction ? '/api' : 'http://localhost:3001/api';

// ============================================
// GERENCIAMENTO DE TOKEN
// ============================================
function getAuthToken() {
    return localStorage.getItem('auth_token');
}

function setAuthToken(token) {
    localStorage.setItem('auth_token', token);
}

function removeAuthToken() {
    localStorage.removeItem('auth_token');
}

// ============================================
// CONFIGURAÇÃO BASE DE REQUISIÇÃO
// ============================================
async function apiRequest(endpoint, options = {}) {
    const token = getAuthToken();

    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    };

    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

        // Verificar se a resposta é JSON
        const contentType = response.headers.get('content-type');
        let data;

        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const text = await response.text();
            console.error('Resposta não-JSON recebida:', text);
            throw new Error('O servidor retornou um erro inesperado. Por favor, tente novamente mais tarde.');
        }

        if (!response.ok) {
            // Se token expirou, fazer logout
            if (response.status === 401 || response.status === 403) {
                removeAuthToken();
                if (window.location.pathname.includes('dashboard')) {
                    window.location.href = 'index.html';
                }
            }
            throw new Error(data.message || 'Erro na requisição');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ============================================
// AUTH API
// ============================================
const AuthAPI = {
    async register(name, email, password) {
        const data = await apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        });

        if (data.token) {
            setAuthToken(data.token);
        }

        return data;
    },

    async login(email, password) {
        const data = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        if (data.token) {
            setAuthToken(data.token);
        }

        return data;
    },

    async getCurrentUser() {
        return await apiRequest('/auth/me');
    },

    logout() {
        removeAuthToken();
    },

    isAuthenticated() {
        return !!getAuthToken();
    }
};

// ============================================
// RECIPES API
// ============================================
const RecipesAPI = {
    async generate(ingredients, preferences = '') {
        return await apiRequest('/recipes/generate', {
            method: 'POST',
            body: JSON.stringify({ ingredients, preferences })
        });
    },

    async analyzeImage(imageBase64) {
        return await apiRequest('/recipes/analyze-image', {
            method: 'POST',
            body: JSON.stringify({ imageBase64 })
        });
    },

    async save(recipe) {
        return await apiRequest('/recipes/save', {
            method: 'POST',
            body: JSON.stringify({ recipe })
        });
    },

    async list() {
        return await apiRequest('/recipes');
    },

    async delete(id) {
        return await apiRequest(`/recipes/${id}`, {
            method: 'DELETE'
        });
    }
};

// ============================================
// MEALS API
// ============================================
const MealsAPI = {
    async create(name, type, description, photoUrl) {
        return await apiRequest('/meals', {
            method: 'POST',
            body: JSON.stringify({ name, type, description, photoUrl })
        });
    },

    async list(filter = 'all', limit = null) {
        let url = '/meals';
        const params = new URLSearchParams();

        if (filter !== 'all') params.append('filter', filter);
        if (limit) params.append('limit', limit);

        if (params.toString()) url += `?${params}`;

        return await apiRequest(url);
    },

    async delete(id) {
        return await apiRequest(`/meals/${id}`, {
            method: 'DELETE'
        });
    },

    async getStats() {
        return await apiRequest('/meals/stats');
    }
};

// ============================================
// PROGRESS API
// ============================================
const ProgressAPI = {
    async create(weight, date, notes = '') {
        return await apiRequest('/progress', {
            method: 'POST',
            body: JSON.stringify({ weight, date, notes })
        });
    },

    async list(limit = null) {
        let url = '/progress';
        if (limit) url += `?limit=${limit}`;

        return await apiRequest(url);
    },

    async getSummary() {
        return await apiRequest('/progress/summary');
    },

    async delete(id) {
        return await apiRequest(`/progress/${id}`, {
            method: 'DELETE'
        });
    }
};

// ============================================
// PROFILE API
// ============================================
const ProfileAPI = {
    async update(data) {
        return await apiRequest('/profile', {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async changePassword(currentPassword, newPassword) {
        return await apiRequest('/profile/password', {
            method: 'PUT',
            body: JSON.stringify({ currentPassword, newPassword })
        });
    },

    async deleteAccount(password) {
        return await apiRequest('/profile', {
            method: 'DELETE',
            body: JSON.stringify({ password })
        });
    }
};

// ============================================
// ADMIN API
// ============================================
const AdminAPI = {
    async getUsers() {
        return await apiRequest('/admin/users');
    },

    async deleteUser(userId) {
        return await apiRequest(`/admin/users/${userId}`, {
            method: 'DELETE'
        });
    },

    async updateUserRole(userId, role) {
        return await apiRequest(`/admin/users/${userId}/role`, {
            method: 'PATCH',
            body: JSON.stringify({ role })
        });
    },

    async getStats() {
        return await apiRequest('/admin/stats');
    }
};

// ============================================
// HEALTH CHECK
// ============================================
async function checkAPIHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        return await response.json();
    } catch (error) {
        console.error('API não disponível:', error);
        return { status: 'offline', aiConfigured: false };
    }
}

// Exportar para uso global
window.AuthAPI = AuthAPI;
window.RecipesAPI = RecipesAPI;
window.MealsAPI = MealsAPI;
window.ProgressAPI = ProgressAPI;
window.ProfileAPI = ProfileAPI;
window.AdminAPI = AdminAPI;
window.checkAPIHealth = checkAPIHealth;
