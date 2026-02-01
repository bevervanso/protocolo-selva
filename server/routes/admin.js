import express from 'express';
import db from '../config/database.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// ============================================
// LISTAR TODOS OS USUÁRIOS
// ============================================
router.get('/users', authenticateToken, isAdmin, (req, res) => {
    try {
        console.log('[AdminAPI] Início da listagem de usuários');

        const users = db.prepare(`
            SELECT u.id, u.name, u.email, u.role, u.created_at,
                   p.weight, p.height, p.goal, p.quiz_completed
            FROM users u
            LEFT JOIN profiles p ON u.id = p.user_id
            ORDER BY u.created_at DESC
        `).all();

        console.log(`[AdminAPI] Consulta concluída. Usuários encontrados: ${users ? users.length : 0}`);

        if (!users) {
            return res.json({ success: true, users: [] });
        }

        const formattedUsers = users.map(u => ({
            id: u.id,
            name: u.name || 'Sem Nome',
            email: u.email || 'Sem Email',
            role: u.role || 'user',
            createdAt: u.created_at || new Date().toISOString(),
            profile: {
                weight: u.weight || null,
                height: u.height || null,
                goal: u.goal || 'lose',
                quizCompleted: !!u.quiz_completed
            }
        }));

        res.json({
            success: true,
            users: formattedUsers
        });
    } catch (error) {
        console.error('[AdminAPI] Erro Fatal na Rota /users:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno ao carregar a lista de usuários',
            error: error.message
        });
    }
});

// ============================================
// REMOVER USUÁRIO
// ============================================
router.delete('/users/:id', authenticateToken, isAdmin, (req, res) => {
    try {
        const userId = req.params.id;

        // Impedir que o admin se delete (opcional mas recomendado)
        if (parseInt(userId) === req.user.userId) {
            return res.status(400).json({ success: false, message: 'Você não pode remover sua própria conta de admin' });
        }

        db.prepare('DELETE FROM users WHERE id = ?').run(userId);

        res.json({
            success: true,
            message: 'Usuário removido com sucesso'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ success: false, message: 'Erro ao remover usuário' });
    }
});

// ============================================
// ATUALIZAR ROLE DO USUÁRIO (Liberar funções)
// ============================================
router.patch('/users/:id/role', authenticateToken, isAdmin, (req, res) => {
    try {
        const userId = req.params.id;
        const { role } = req.body;

        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Role inválida' });
        }

        db.prepare('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(role, userId);

        res.json({
            success: true,
            message: `Usuário atualizado para ${role}`
        });
    } catch (error) {
        console.error('Update user role error:', error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar usuário' });
    }
});

// ============================================
// ESTATÍSTICAS GERAIS
// ============================================
router.get('/stats', authenticateToken, isAdmin, (req, res) => {
    try {
        console.log('[AdminAPI] Calculando estatísticas');

        const countUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
        const countMeals = db.prepare('SELECT COUNT(*) as count FROM meals').get();
        const countRecipes = db.prepare('SELECT COUNT(*) as count FROM recipes').get();
        const countNewToday = db.prepare("SELECT COUNT(*) as count FROM users WHERE date(created_at) = date('now')").get();

        const stats = {
            totalUsers: countUsers ? countUsers.count : 0,
            totalMeals: countMeals ? countMeals.count : 0,
            totalRecipes: countRecipes ? countRecipes.count : 0,
            newUsersToday: countNewToday ? countNewToday.count : 0
        };

        console.log('[AdminAPI] Estatísticas calculadas:', stats);

        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('[AdminAPI] Erro Fatal na Rota /stats:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno ao calcular estatísticas',
            error: error.message
        });
    }
});

export default router;
