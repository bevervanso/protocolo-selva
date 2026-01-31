import express from 'express';
import db from '../config/database.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// ============================================
// LISTAR TODOS OS USUÁRIOS
// ============================================
router.get('/users', authenticateToken, isAdmin, (req, res) => {
    try {
        const users = db.prepare(`
            SELECT u.id, u.name, u.email, u.role, u.created_at,
                   p.weight, p.height, p.goal, p.quiz_completed
            FROM users u
            LEFT JOIN profiles p ON u.id = p.user_id
            ORDER BY u.created_at DESC
        `).all();

        res.json({
            success: true,
            users: users.map(u => ({
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
                createdAt: u.created_at,
                profile: {
                    weight: u.weight,
                    height: u.height,
                    goal: u.goal,
                    quizCompleted: !!u.quiz_completed
                }
            }))
        });
    } catch (error) {
        console.error('List users error:', error);
        res.status(500).json({ success: false, message: 'Erro ao listar usuários' });
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
        const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
        const totalMeals = db.prepare('SELECT COUNT(*) as count FROM meals').get().count;
        const totalRecipes = db.prepare('SELECT COUNT(*) as count FROM recipes').get().count;
        const newUsersToday = db.prepare("SELECT COUNT(*) as count FROM users WHERE date(created_at) = date('now')").get().count;

        res.json({
            success: true,
            stats: {
                totalUsers,
                totalMeals,
                totalRecipes,
                newUsersToday
            }
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ success: false, message: 'Erro ao obter estatísticas' });
    }
});

export default router;
