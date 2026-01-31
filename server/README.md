# 🌿 Protocolo Selva - Backend API

Backend Node.js/Express para o aplicativo Protocolo Selva com integração de IA para geração de receitas.

## 📋 Requisitos

- Node.js 18+ 
- npm ou yarn

## 🚀 Instalação

1. **Navegue até o diretório do servidor:**
```bash
cd server
```

2. **Instale as dependências:**
```bash
npm install
```

3. **Configure as variáveis de ambiente:**
```bash
cp .env.example .env
```

4. **Edite o arquivo `.env` com suas chaves:**
```env
PORT=3001
JWT_SECRET=sua-chave-jwt-super-secreta-aqui
OPENAI_API_KEY=sk-sua-chave-openai-aqui
```

## 🔑 Obtendo Chaves API

### OpenAI API Key
1. Acesse [platform.openai.com](https://platform.openai.com/)
2. Crie uma conta ou faça login
3. Vá em **API Keys** → **Create new secret key**
4. Copie a chave e cole no arquivo `.env`

### Google AI (Gemini) - Opcional
1. Acesse [makersuite.google.com](https://makersuite.google.com/)
2. Crie uma chave de API
3. Cole no `GOOGLE_AI_API_KEY` no `.env`

## 🏃 Executando

### Modo desenvolvimento (com hot reload):
```bash
npm run dev
```

### Modo produção:
```bash
npm start
```

O servidor iniciará em `http://localhost:3001`

## 📚 Endpoints da API

### Autenticação
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/auth/register` | Criar conta |
| POST | `/api/auth/login` | Fazer login |
| GET | `/api/auth/me` | Obter usuário atual |

### Receitas
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/recipes/generate` | Gerar receita com IA |
| POST | `/api/recipes/analyze-image` | Analisar imagem de ingredientes |
| POST | `/api/recipes/save` | Salvar receita |
| GET | `/api/recipes` | Listar receitas salvas |
| DELETE | `/api/recipes/:id` | Deletar receita |

### Refeições
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/meals` | Registrar refeição |
| GET | `/api/meals` | Listar refeições |
| GET | `/api/meals/stats` | Estatísticas |
| DELETE | `/api/meals/:id` | Deletar refeição |

### Progresso
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/progress` | Registrar peso |
| GET | `/api/progress` | Histórico de peso |
| GET | `/api/progress/summary` | Resumo do progresso |
| DELETE | `/api/progress/:id` | Deletar registro |

### Perfil
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| PUT | `/api/profile` | Atualizar perfil |
| PUT | `/api/profile/password` | Alterar senha |
| DELETE | `/api/profile` | Deletar conta |

## 🔒 Autenticação

Todas as rotas (exceto login/register) requerem autenticação via JWT.

Envie o token no header:
```
Authorization: Bearer seu-token-jwt
```

## 🗄️ Banco de Dados

O projeto usa SQLite para simplicidade. O banco é criado automaticamente em `server/data/protocolo-selva.db`.

### Tabelas:
- `users` - Usuários
- `profiles` - Perfis dos usuários
- `meals` - Refeições registradas
- `recipes` - Receitas salvas
- `progress` - Histórico de peso

## 🤖 Integração com IA

A geração de receitas usa a API da OpenAI (GPT-4o-mini) com prompts otimizados para:
- Dieta low-carb/carnívora
- Foco em proteínas e gorduras saudáveis
- Sem açúcares ou ultraprocessados

Se a chave não estiver configurada, o endpoint retorna erro 503.

## 📁 Estrutura de Arquivos

```
server/
├── config/
│   └── database.js      # Configuração SQLite
├── middleware/
│   └── auth.js          # Middleware JWT
├── routes/
│   ├── auth.js          # Rotas de autenticação
│   ├── meals.js         # Rotas de refeições
│   ├── profile.js       # Rotas de perfil
│   ├── progress.js      # Rotas de progresso
│   └── recipes.js       # Rotas de receitas + IA
├── data/                # Banco de dados (criado automaticamente)
├── .env.example         # Exemplo de variáveis
├── package.json
└── server.js            # Entry point
```

## 🐛 Troubleshooting

### "Cannot find module 'better-sqlite3'"
```bash
npm rebuild better-sqlite3
```

### "OPENAI_API_KEY not configured"
Verifique se o arquivo `.env` existe e contém a chave válida.

### Porta em uso
Altere a variável `PORT` no `.env` para outra porta.
