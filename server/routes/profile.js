import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ============================================
// ATUALIZAR PERFIL
// ============================================
router.put('/', authenticateToken, (req, res) => {
    try {
        const { name, email, weight, height, goal, goalWeight } = req.body;
        const userId = req.user.userId;

        // Atualizar usuário
        if (name || email) {
            // Verificar se novo email já existe
            if (email) {
                const existingUser = db.prepare(`
          SELECT id FROM users WHERE email = ? AND id != ?
        `).get(email, userId);

                if (existingUser) {
                    return res.status(409).json({
                        success: false,
                        message: 'Este email já está em uso'
                    });
                }
            }

            db.prepare(`
        UPDATE users 
        SET name = COALESCE(?, name), 
            email = COALESCE(?, email),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(name, email, userId);
        }

        // Atualizar perfil
        db.prepare(`
      UPDATE profiles 
      SET weight = COALESCE(?, weight),
          height = COALESCE(?, height),
          goal = COALESCE(?, goal),
          goal_weight = COALESCE(?, goal_weight),
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).run(weight, height, goal, goalWeight, userId);

        // Buscar dados atualizados
        const user = db.prepare(`
      SELECT u.id, u.name, u.email, u.created_at,
             p.weight, p.height, p.goal, p.goal_weight
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.id = ?
    `).get(userId);

        res.json({
            success: true,
            message: 'Perfil atualizado com sucesso!',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                createdAt: user.created_at,
                profile: {
                    weight: user.weight,
                    height: user.height,
                    goal: user.goal,
                    goalWeight: user.goal_weight
                }
            }
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar perfil'
        });
    }
});

// ============================================
// ALTERAR SENHA
// ============================================
router.put('/password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.userId;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Senha atual e nova senha são obrigatórias'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'A nova senha deve ter no mínimo 6 caracteres'
            });
        }

        // Buscar usuário
        const user = db.prepare('SELECT password FROM users WHERE id = ?').get(userId);

        // Verificar senha atual
        const validPassword = await bcrypt.compare(currentPassword, user.password);
        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: 'Senha atual incorreta'
            });
        }

        // Hash nova senha
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Atualizar senha
        db.prepare(`
      UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(hashedPassword, userId);

        res.json({
            success: true,
            message: 'Senha alterada com sucesso!'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao alterar senha'
        });
    }
});

// ============================================
// DELETAR CONTA
// ============================================
router.delete('/', authenticateToken, async (req, res) => {
    try {
        const { password } = req.body;
        const userId = req.user.userId;

        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Senha é obrigatória para deletar a conta'
            });
        }

        // Buscar usuário
        const user = db.prepare('SELECT password FROM users WHERE id = ?').get(userId);

        // Verificar senha
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: 'Senha incorreta'
            });
        }

        // Deletar usuário (cascade delete removes related data)
        db.prepare('DELETE FROM users WHERE id = ?').run(userId);

        res.json({
            success: true,
            message: 'Conta deletada com sucesso'
        });

    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao deletar conta'
        });
    }
});

export default router;
