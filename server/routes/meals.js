import express from 'express';
import db from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ============================================
// REGISTRAR REFEIÇÃO
// ============================================
router.post('/', authenticateToken, (req, res) => {
    try {
        const { name, type, description, photoUrl } = req.body;
        const userId = req.user.userId;

        if (!name || !type) {
            return res.status(400).json({
                success: false,
                message: 'Nome e tipo da refeição são obrigatórios'
            });
        }

        const validTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Tipo de refeição inválido'
            });
        }

        const result = db.prepare(`
      INSERT INTO meals (user_id, name, type, description, photo_url)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, name, type, description || '', photoUrl || '');

        res.status(201).json({
            success: true,
            message: 'Refeição registrada com sucesso!',
            meal: {
                id: result.lastInsertRowid,
                name,
                type,
                description,
                photoUrl,
                createdAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Create meal error:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao registrar refeição'
        });
    }
});

// ============================================
// LISTAR REFEIÇÕES
// ============================================
router.get('/', authenticateToken, (req, res) => {
    try {
        const { filter, limit } = req.query;
        const userId = req.user.userId;

        let query = 'SELECT * FROM meals WHERE user_id = ?';
        const params = [userId];

        if (filter && filter !== 'all') {
            query += ' AND type = ?';
            params.push(filter);
        }

        query += ' ORDER BY created_at DESC';

        if (limit) {
            query += ' LIMIT ?';
            params.push(parseInt(limit));
        }

        const meals = db.prepare(query).all(...params);

        res.json({
            success: true,
            meals: meals.map(m => ({
                id: m.id,
                name: m.name,
                type: m.type,
                description: m.description,
                photoUrl: m.photo_url,
                createdAt: m.created_at
            }))
        });

    } catch (error) {
        console.error('List meals error:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao listar refeições'
        });
    }
});

// ============================================
// DELETAR REFEIÇÃO
// ============================================
router.delete('/:id', authenticateToken, (req, res) => {
    try {
        const result = db.prepare(`
      DELETE FROM meals WHERE id = ? AND user_id = ?
    `).run(req.params.id, req.user.userId);

        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Refeição não encontrada'
            });
        }

        res.json({
            success: true,
            message: 'Refeição removida'
        });

    } catch (error) {
        console.error('Delete meal error:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao deletar refeição'
        });
    }
});

// ============================================
// ESTATÍSTICAS
// ============================================
router.get('/stats', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;

        // Total de refeições
        const totalMeals = db.prepare(`
      SELECT COUNT(*) as count FROM meals WHERE user_id = ?
    `).get(userId).count;

        // Refeições por tipo
        const mealsByType = db.prepare(`
      SELECT type, COUNT(*) as count 
      FROM meals 
      WHERE user_id = ? 
      GROUP BY type
    `).all(userId);

        // Streak de dias
        const streak = calculateStreak(userId);

        res.json({
            success: true,
            stats: {
                totalMeals,
                mealsByType: Object.fromEntries(mealsByType.map(m => [m.type, m.count])),
                streak
            }
        });

    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao obter estatísticas'
        });
    }
});

function calculateStreak(userId) {
    const meals = db.prepare(`
    SELECT DISTINCT DATE(created_at) as date 
    FROM meals 
    WHERE user_id = ? 
    ORDER BY date DESC
  `).all(userId);

    if (meals.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < meals.length; i++) {
        const mealDate = new Date(meals[i].date);
        const expectedDate = new Date(today);
        expectedDate.setDate(expectedDate.getDate() - i);

        if (mealDate.toDateString() === expectedDate.toDateString()) {
            streak++;
        } else {
            break;
        }
    }

    return streak;
}

export default router;
