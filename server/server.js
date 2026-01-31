import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

// Carregar variáveis de ambiente
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Criar diretório de dados se não existir
const dataDir = join(__dirname, 'data');
if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
}

// Importar rotas
import authRoutes from './routes/auth.js';
import recipesRoutes from './routes/recipes.js';
import mealsRoutes from './routes/meals.js';
import progressRoutes from './routes/progress.js';
import profileRoutes from './routes/profile.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:5500', 'http://localhost:5500'],
    credentials: true
}));

app.use(express.json({ limit: '10mb' })); // Aumentado para suportar imagens base64
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos do frontend
app.use(express.static(join(__dirname, '..')));

// ============================================
// ROTAS DA API
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/recipes', recipesRoutes);
app.use('/api/meals', mealsRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/profile', profileRoutes);

// ============================================
// HEALTH CHECK
// ============================================
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        aiConfigured: !!process.env.OPENAI_API_KEY
    });
});

// ============================================
// ROTA CATCH-ALL PARA SPA
// ============================================
app.get('*', (req, res) => {
    // Se não for uma rota de API, servir o index.html
    if (!req.path.startsWith('/api')) {
        res.sendFile(join(__dirname, '..', 'index.html'));
    } else {
        res.status(404).json({ error: 'Rota não encontrada' });
    }
});

// ============================================
// ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
    });
});

// ============================================
// INICIAR SERVIDOR
// ============================================
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════╗
║        🌿 PROTOCOLO SELVA - Backend API 🌿       ║
╠══════════════════════════════════════════════════╣
║  Server running on: http://localhost:${PORT}         ║
║  AI Integration: ${process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Not configured'}            ║
╚══════════════════════════════════════════════════╝
  `);
});

export default app;
