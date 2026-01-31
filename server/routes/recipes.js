import express from 'express';
import OpenAI from 'openai';
import db from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Inicializar OpenAI (será null se não houver chave)
let openai = null;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });
}

// ============================================
// GERAR RECEITA COM IA
// ============================================
router.post('/generate', authenticateToken, async (req, res) => {
    try {
        const { ingredients, method, preferences } = req.body;

        if (!openai) {
            return res.status(503).json({
                success: false,
                message: 'Serviço de IA não configurado. Configure a OPENAI_API_KEY no servidor.'
            });
        }

        if (!ingredients || ingredients.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Por favor, informe os ingredientes disponíveis'
            });
        }

        const systemPrompt = `Você é um nutricionista especialista em dietas low-carb, carnívora e Protocolo Selva.
Crie receitas saudáveis focadas em:
- Proteínas de alta qualidade (carnes, peixes, ovos)
- Gorduras saudáveis (azeite, abacate, castanhas)
- Baixo teor de carboidratos
- Sem açúcares refinados ou ultraprocessados

Responda SEMPRE em formato JSON válido com a seguinte estrutura:
{
  "name": "Nome da receita",
  "time": "tempo de preparo (ex: 25min)",
  "calories": "calorias aproximadas (ex: 520kcal)",
  "protein": "proteína aproximada (ex: 48g)",
  "ingredients": ["ingrediente 1", "ingrediente 2", ...],
  "steps": ["passo 1", "passo 2", ...],
  "tip": "dica nutricional ou de preparo"
}`;

        const userPrompt = `Crie uma receita deliciosa e saudável usando principalmente estes ingredientes: ${ingredients}
${preferences ? `Preferências: ${preferences}` : ''}

Lembre-se de focar em proteínas e gorduras boas, mantendo baixo carboidrato.`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.8,
            max_tokens: 1000
        });

        const responseText = completion.choices[0].message.content;

        // Tentar extrair JSON da resposta
        let recipe;
        try {
            // Remover markdown code blocks se houver
            const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
                responseText.match(/```\s*([\s\S]*?)\s*```/) ||
                [null, responseText];
            recipe = JSON.parse(jsonMatch[1] || responseText);
        } catch (parseError) {
            console.error('Failed to parse AI response:', responseText);
            return res.status(500).json({
                success: false,
                message: 'Erro ao processar resposta da IA'
            });
        }

        res.json({
            success: true,
            recipe
        });

    } catch (error) {
        console.error('Generate recipe error:', error);

        if (error.code === 'insufficient_quota') {
            return res.status(503).json({
                success: false,
                message: 'Cota da API excedida. Tente novamente mais tarde.'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Erro ao gerar receita. Tente novamente.'
        });
    }
});

// ============================================
// ANALISAR IMAGEM DE INGREDIENTES
// ============================================
router.post('/analyze-image', authenticateToken, async (req, res) => {
    try {
        const { imageBase64 } = req.body;

        if (!openai) {
            return res.status(503).json({
                success: false,
                message: 'Serviço de IA não configurado.'
            });
        }

        if (!imageBase64) {
            return res.status(400).json({
                success: false,
                message: 'Imagem não fornecida'
            });
        }

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'Você é um assistente que identifica ingredientes em fotos. Liste apenas os ingredientes que você consegue identificar, separados por vírgula. Seja conciso.'
                },
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: 'Quais ingredientes você consegue identificar nesta imagem?'
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: imageBase64.startsWith('data:')
                                    ? imageBase64
                                    : `data:image/jpeg;base64,${imageBase64}`
                            }
                        }
                    ]
                }
            ],
            max_tokens: 200
        });

        const ingredients = completion.choices[0].message.content;

        res.json({
            success: true,
            ingredients
        });

    } catch (error) {
        console.error('Analyze image error:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao analisar imagem'
        });
    }
});

// ============================================
// SALVAR RECEITA
// ============================================
router.post('/save', authenticateToken, (req, res) => {
    try {
        const { recipe } = req.body;
        const userId = req.user.userId;

        if (!recipe || !recipe.name) {
            return res.status(400).json({
                success: false,
                message: 'Dados da receita inválidos'
            });
        }

        // Verificar se já existe
        const existing = db.prepare(`
      SELECT id FROM recipes WHERE user_id = ? AND name = ?
    `).get(userId, recipe.name);

        if (existing) {
            return res.status(409).json({
                success: false,
                message: 'Receita já está salva'
            });
        }

        const result = db.prepare(`
      INSERT INTO recipes (user_id, name, time, calories, protein, ingredients, steps, tip)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
            userId,
            recipe.name,
            recipe.time || '',
            recipe.calories || '',
            recipe.protein || '',
            JSON.stringify(recipe.ingredients || []),
            JSON.stringify(recipe.steps || []),
            recipe.tip || ''
        );

        res.status(201).json({
            success: true,
            message: 'Receita salva com sucesso!',
            recipeId: result.lastInsertRowid
        });

    } catch (error) {
        console.error('Save recipe error:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao salvar receita'
        });
    }
});

// ============================================
// LISTAR RECEITAS SALVAS
// ============================================
router.get('/', authenticateToken, (req, res) => {
    try {
        const recipes = db.prepare(`
      SELECT * FROM recipes WHERE user_id = ? ORDER BY saved_at DESC
    `).all(req.user.userId);

        // Parse JSON fields
        const parsedRecipes = recipes.map(r => ({
            ...r,
            ingredients: JSON.parse(r.ingredients || '[]'),
            steps: JSON.parse(r.steps || '[]')
        }));

        res.json({
            success: true,
            recipes: parsedRecipes
        });

    } catch (error) {
        console.error('List recipes error:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao listar receitas'
        });
    }
});

// ============================================
// DELETAR RECEITA
// ============================================
router.delete('/:id', authenticateToken, (req, res) => {
    try {
        const result = db.prepare(`
      DELETE FROM recipes WHERE id = ? AND user_id = ?
    `).run(req.params.id, req.user.userId);

        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Receita não encontrada'
            });
        }

        res.json({
            success: true,
            message: 'Receita removida'
        });

    } catch (error) {
        console.error('Delete recipe error:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao deletar receita'
        });
    }
});

export default router;
