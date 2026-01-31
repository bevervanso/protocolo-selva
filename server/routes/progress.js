import express from 'express';
import db from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ============================================
// REGISTRAR PESO
// ============================================
router.post('/', authenticateToken, (req, res) => {
    try {
        const { weight, date, notes } = req.body;
        const userId = req.user.userId;

        if (!weight || !date) {
            return res.status(400).json({
                success: false,
                message: 'Peso e data são obrigatórios'
            });
        }

        const result = db.prepare(`
      INSERT INTO progress (user_id, weight, date, notes)
      VALUES (?, ?, ?, ?)
    `).run(userId, weight, date, notes || '');

        // Atualizar peso no perfil
        db.prepare(`
      UPDATE profiles SET weight = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).run(weight, userId);

        res.status(201).json({
            success: true,
            message: 'Peso registrado com sucesso!',
            progress: {
                id: result.lastInsertRowid,
                weight,
                date,
                notes
            }
        });

    } catch (error) {
        console.error('Create progress error:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao registrar peso'
        });
    }
});

// ============================================
// LISTAR HISTÓRICO DE PESO
// ============================================
router.get('/', authenticateToken, (req, res) => {
    try {
        const { limit } = req.query;
        const userId = req.user.userId;

        let query = 'SELECT * FROM progress WHERE user_id = ? ORDER BY date DESC';
        const params = [userId];

        if (limit) {
            query += ' LIMIT ?';
            params.push(parseInt(limit));
        }

        const progress = db.prepare(query).all(...params);

        res.json({
            success: true,
            progress: progress.map(p => ({
                id: p.id,
                weight: p.weight,
                date: p.date,
                notes: p.notes,
                createdAt: p.created_at
            }))
        });

    } catch (error) {
        console.error('List progress error:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao listar histórico'
        });
    }
});

// ============================================
// RESUMO DO PROGRESSO
// ============================================
router.get('/summary', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;

        // Buscar perfil
        const profile = db.prepare(`
      SELECT * FROM profiles WHERE user_id = ?
    `).get(userId);

        // Buscar primeiro e último peso
        const firstProgress = db.prepare(`
      SELECT * FROM progress WHERE user_id = ? ORDER BY date ASC LIMIT 1
    `).get(userId);

        const lastProgress = db.prepare(`
      SELECT * FROM progress WHERE user_id = ? ORDER BY date DESC LIMIT 1
    `).get(userId);

        const startWeight = firstProgress?.weight || profile?.weight || null;
        const currentWeight = lastProgress?.weight || profile?.weight || null;
        const goalWeight = profile?.goal_weight || null;

        let totalLost = null;
        let remainingToGoal = null;
        let progressPercentage = null;

        if (startWeight && currentWeight) {
            totalLost = startWeight - currentWeight;
        }

        if (currentWeight && goalWeight) {
            remainingToGoal = currentWeight - goalWeight;

            if (startWeight && startWeight !== goalWeight) {
                progressPercentage = Math.min(100, Math.max(0,
                    ((startWeight - currentWeight) / (startWeight - goalWeight)) * 100
                ));
            }
        }

        res.json({
            success: true,
            summary: {
                startWeight,
                currentWeight,
                goalWeight,
                totalLost,
                remainingToGoal,
                progressPercentage: progressPercentage ? Math.round(progressPercentage) : null
            }
        });

    } catch (error) {
        console.error('Progress summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao obter resumo'
        });
    }
});

// ============================================
// DELETAR REGISTRO
// ============================================
router.delete('/:id', authenticateToken, (req, res) => {
    try {
        const result = db.prepare(`
      DELETE FROM progress WHERE id = ? AND user_id = ?
    `).run(req.params.id, req.user.userId);

        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Registro não encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Registro removido'
        });

    } catch (error) {
        console.error('Delete progress error:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao deletar registro'
        });
    }
});

export default router;
