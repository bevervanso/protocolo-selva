# 🌿 Protocolo Selva

Uma aplicação web completa para acompanhamento da dieta ancestral/low-carb, com gerador de receitas com IA.

![Protocolo Selva](https://img.shields.io/badge/Protocolo-Selva-green?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js)
![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-412991?style=for-the-badge&logo=openai)

## ✨ Funcionalidades

- 🔐 **Sistema de autenticação** com JWT
- 🤖 **Gerador de receitas com IA** (OpenAI GPT-4)
- 📸 **Análise de fotos** de ingredientes
- 📊 **Dashboard** para acompanhar progresso
- 🍽️ **Registro de refeições** com fotos
- 📈 **Acompanhamento de peso** com gráficos
- 👤 **Perfil do usuário** personalizável

## 🚀 Instalação

### Pré-requisitos

- Node.js 18+
- npm ou yarn

### 1. Clone o repositório

```bash
git clone https://github.com/SEU_USUARIO/protocolo-selva.git
cd protocolo-selva
```

### 2. Instale as dependências do backend

```bash
cd server
npm install
```

### 3. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas chaves:

```env
PORT=3001
JWT_SECRET=sua-chave-jwt-super-secreta
OPENAI_API_KEY=sk-sua-chave-openai-aqui
```

### 4. Inicie o servidor

```bash
npm run dev
```

O servidor estará disponível em `http://localhost:3001`

## 📁 Estrutura do Projeto

```
protocolo-selva/
├── index.html              # Landing page
├── dashboard.html          # Dashboard do usuário
├── styles.css              # Estilos da landing page
├── dashboard.css           # Estilos do dashboard
├── app.js                  # JavaScript da landing page
├── dashboard.js            # JavaScript do dashboard
├── api.js                  # Cliente da API
├── images/                 # Imagens geradas
└── server/                 # Backend
    ├── config/
    │   └── database.js     # Configuração SQLite
    ├── middleware/
    │   └── auth.js         # Autenticação JWT
    ├── routes/
    │   ├── auth.js         # Rotas de autenticação
    │   ├── meals.js        # Rotas de refeições
    │   ├── profile.js      # Rotas de perfil
    │   ├── progress.js     # Rotas de progresso
    │   └── recipes.js      # Rotas de receitas + IA
    ├── data/               # Banco de dados (auto-criado)
    ├── .env.example        # Exemplo de variáveis
    ├── package.json
    ├── server.js           # Entry point
    └── README.md           # Documentação do backend
```

## 🔌 Endpoints da API

### Autenticação

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/api/auth/register` | Criar conta |
| `POST` | `/api/auth/login` | Fazer login |
| `GET` | `/api/auth/me` | Obter usuário atual |

### Receitas

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/api/recipes/generate` | Gerar receita com IA |
| `POST` | `/api/recipes/analyze-image` | Analisar foto de ingredientes |
| `POST` | `/api/recipes/save` | Salvar receita |
| `GET` | `/api/recipes` | Listar receitas salvas |
| `DELETE` | `/api/recipes/:id` | Deletar receita |

### Refeições

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/api/meals` | Registrar refeição |
| `GET` | `/api/meals` | Listar refeições |
| `GET` | `/api/meals/stats` | Estatísticas |
| `DELETE` | `/api/meals/:id` | Deletar refeição |

### Progresso

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/api/progress` | Registrar peso |
| `GET` | `/api/progress` | Histórico de peso |
| `GET` | `/api/progress/summary` | Resumo do progresso |
| `DELETE` | `/api/progress/:id` | Deletar registro |

## 🔐 Segurança

- Senhas criptografadas com **bcrypt**
- Autenticação via **JWT** (tokens válidos por 7 dias)
- Chaves API armazenadas no servidor (não expostas ao cliente)

## 🤖 Integração com IA

A geração de receitas usa a API da OpenAI (GPT-4o-mini) com prompts otimizados para:

- Dieta low-carb/carnívora
- Foco em proteínas e gorduras saudáveis
- Sem açúcares ou ultraprocessados
- Receitas práticas e deliciosas

## 📝 Licença

MIT License - sinta-se livre para usar e modificar!

---

Feito com 💚 para uma vida mais saudável
