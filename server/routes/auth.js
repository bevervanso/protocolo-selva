import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../config/database.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ============================================
// REGISTRO DE USUÁRIO
// ============================================
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validação
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Nome, email e senha são obrigatórios'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'A senha deve ter no mínimo 6 caracteres'
            });
        }

        // Verificar se email já existe
        const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'Este email já está cadastrado'
            });
        }

        // Hash da senha
        const hashedPassword = await bcrypt.hash(password, 10);

        // Inserir usuário
        const result = db.prepare(`
      INSERT INTO users (name, email, password)
      VALUES (?, ?, ?)
    `).run(name, email, hashedPassword);

        // Criar perfil vazio
        db.prepare(`
      INSERT INTO profiles (user_id)
      VALUES (?)
    `).run(result.lastInsertRowid);

        // Gerar token
        const token = generateToken(result.lastInsertRowid);

        res.status(201).json({
            success: true,
            message: 'Conta criada com sucesso!',
            token,
            user: {
                id: result.lastInsertRowid,
                name,
                email
            }
        });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// ============================================
// LOGIN
// ============================================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validação
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email e senha são obrigatórios'
            });
        }

        // Buscar usuário
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Email ou senha incorretos'
            });
        }

        // Verificar senha
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: 'Email ou senha incorretos'
            });
        }

        // Gerar token
        const token = generateToken(user.id);

        res.json({
            success: true,
            message: 'Login realizado com sucesso!',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                createdAt: user.created_at
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// ============================================
// OBTER USUÁRIO ATUAL
// ============================================
router.get('/me', authenticateToken, (req, res) => {
    try {
        const user = db.prepare(`
      SELECT u.id, u.name, u.email, u.created_at,
             p.weight, p.height, p.goal, p.goal_weight, p.quiz_completed
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.id = ?
    `).get(req.user.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                createdAt: user.created_at,
                profile: {
                    weight: user.weight,
                    height: user.height,
                    goal: user.goal,
                    goalWeight: user.goal_weight,
                    quizCompleted: !!user.quiz_completed
                }
            }
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

export default router;
