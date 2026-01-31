import jwt from 'jsonwebtoken';
import db from '../config/database.js';

export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Token de acesso requerido'
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                message: 'Token inválido ou expirado'
            });
        }

        req.user = user;
        next();
    });
};

export const isAdmin = (req, res, next) => {
    // Primeiro autentica o token (se já não foi feito pelo middleware anterior)
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
    }

    try {
        console.log(`Admin Check: Verifying user ID ${req.user.userId}`);
        const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.user.userId);
        console.log(`Admin Check: User role is ${user ? user.role : 'not found'}`);

        if (user && user.role === 'admin') {
            next();
        } else {
            res.status(403).json({
                success: false,
                message: 'Acesso negado. Requer privilégios de administrador.'
            });
        }
    } catch (err) {
        console.error('Admin check error:', err);
        res.status(500).json({ success: false, message: 'Erro ao verificar privilégios' });
    }
};

export const generateToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};
