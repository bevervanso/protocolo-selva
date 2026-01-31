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
// GERAR RECEITA COM IA - DIETA DA SELVA
// ============================================
router.post('/generate', authenticateToken, async (req, res) => {
    try {
        const { ingredients, mealType, preferences } = req.body;
        const userId = req.user.userId;

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

        // Buscar receitas já salvas pelo usuário para evitar repetição
        let savedRecipeNames = [];
        try {
            const savedRecipes = db.prepare(`
                SELECT name FROM recipes WHERE user_id = ?
            `).all(userId);
            savedRecipeNames = savedRecipes.map(r => r.name);
        } catch (e) {
            console.log('Erro ao buscar receitas salvas:', e);
        }

        // Determinar tipo de refeição baseado no horário ou parâmetro
        const hour = new Date().getHours();
        let mealContext = mealType || 'any';

        if (mealContext === 'any' || !mealContext) {
            if (hour >= 5 && hour < 10) {
                mealContext = 'cafe_da_manha';
            } else if (hour >= 10 && hour < 14) {
                mealContext = 'almoco';
            } else if (hour >= 14 && hour < 18) {
                mealContext = 'lanche';
            } else {
                mealContext = 'jantar';
            }
        }

        // Contexto específico para cada tipo de refeição
        const mealContexts = {
            'cafe_da_manha': {
                name: 'Café da Manhã',
                suggestions: 'ovos (mexidos, fritos, omelete), bacon, queijo, iogurte natural com frutas e mel, panquecas de ovo',
                style: 'Receitas rápidas e energéticas para começar o dia'
            },
            'almoco': {
                name: 'Almoço',
                suggestions: 'carnes grelhadas, bifes, frango assado, peixes, hambúrgueres sem pão, saladas com proteína',
                style: 'Refeição principal do dia, substancial e nutritiva'
            },
            'lanche': {
                name: 'Lanche da Tarde',
                suggestions: 'queijos, ovos cozidos, iogurte natural com mel, frutas com queijo, castanhas',
                style: 'Opções práticas e rápidas para matar a fome'
            },
            'jantar': {
                name: 'Jantar',
                suggestions: 'carnes nobres, peixes, sopas cremosas de legumes com carne, omeletes recheados',
                style: 'Refeição mais leve que o almoço, mas ainda satisfatória'
            }
        };

        const currentMeal = mealContexts[mealContext] || mealContexts['almoco'];

        const systemPrompt = `Você é um nutricionista especialista na DIETA DA SELVA.

## REGRAS DA DIETA DA SELVA (OBRIGATÓRIO):
A dieta é baseada em alimentos NATURAIS e ANCESTRAIS. Apenas estes alimentos são permitidos:

✅ PERMITIDOS:
- CARNES: bovina, suína, frango, peixe, cordeiro, fígado, bacon, linguiça artesanal
- OVOS: qualquer preparo (fritos, mexidos, cozidos, omeletes, poché)
- GORDURAS: manteiga, banha, azeite de oliva, óleo de coco, gordura do bacon
- LATICÍNIOS: queijos (todos os tipos), iogurte natural integral (sem açúcar), creme de leite, nata
- FRUTAS: todas as frutas naturais (morango, banana, maçã, laranja, abacate, etc.)
- MEL: mel puro de abelha (único adoçante permitido)
- OUTROS: sal, especiarias naturais, ervas frescas

❌ PROIBIDOS (NUNCA USE):
- Açúcar refinado, adoçantes artificiais
- Farinhas (trigo, milho, etc.)
- Pão, massas, arroz, batata
- Óleos vegetais refinados (soja, canola, girassol)
- Produtos industrializados/ultraprocessados
- Refrigerantes, sucos de caixinha
- Leguminosas (feijão, lentilha, grão de bico)
- Grãos e cereais

## CONTEXTO DA REFEIÇÃO:
- Tipo: ${currentMeal.name}
- Estilo: ${currentMeal.style}
- Sugestões típicas: ${currentMeal.suggestions}

## RECEITAS JÁ SALVAS PELO USUÁRIO (NÃO REPETIR):
${savedRecipeNames.length > 0 ? savedRecipeNames.join(', ') : 'Nenhuma ainda'}

## FORMATO DE RESPOSTA:
Responda APENAS com JSON válido (sem markdown):
{
  "name": "Nome criativo da receita",
  "time": "tempo de preparo (ex: 25min)",
  "calories": "calorias aproximadas (ex: 520kcal)",
  "protein": "proteína aproximada (ex: 48g)",
  "ingredients": ["ingrediente 1 com quantidade", "ingrediente 2 com quantidade", ...],
  "steps": ["passo 1 detalhado", "passo 2 detalhado", ...],
  "tip": "dica nutricional ou de preparo relacionada à Dieta da Selva"
}`;

        const userPrompt = `Crie uma receita DELICIOSA para ${currentMeal.name} usando estes ingredientes: ${ingredients}

${preferences ? `Preferências adicionais: ${preferences}` : ''}

REGRAS:
1. Use APENAS ingredientes permitidos na Dieta da Selva
2. Crie um nome DIFERENTE das receitas já salvas
3. A receita deve ser apropriada para ${currentMeal.name}
4. Seja criativo e prático!`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.9, // Aumentado para mais criatividade
            max_tokens: 1200
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

        // Adicionar metadados
        recipe.mealType = mealContext;
        recipe.mealTypeName = currentMeal.name;

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
