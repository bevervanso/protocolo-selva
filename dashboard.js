// ============================================
// DASHBOARD - Main Logic
// ============================================

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    checkDashboardAuth();
    initNavigation();
    initMethodTabs();
    initMealFilters();
    initPhotoUploads();
    loadDashboardData();
    loadDailyTip();
    setTodayDate();
});

// ============================================
// AUTHENTICATION CHECK
// ============================================
async function checkDashboardAuth() {
    let user = null;

    // Primeiro tenta autenticação via API
    if (typeof AuthAPI !== 'undefined' && AuthAPI.isAuthenticated()) {
        try {
            const response = await AuthAPI.getCurrentUser();
            if (response.success) {
                user = response.user;
                // Guardar no localStorage para acesso rápido
                const appData = getAppData();
                appData.currentApiUser = user;
                saveAppData(appData);
            }
        } catch (e) {
            console.log('Erro ao verificar usuário da API:', e.message);
        }
    }

    // Fallback para localStorage
    if (!user) {
        user = getCurrentUser();
    }

    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    // Update UI with user info
    const greeting = document.getElementById('userGreeting');
    const avatar = document.getElementById('userAvatar');
    const profileAvatar = document.getElementById('profileAvatar');
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');

    const userName = user.name || 'Usuário';
    const userEmail = user.email || '';
    const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    if (greeting) greeting.textContent = `Olá, ${userName.split(' ')[0]}!`;
    if (avatar) avatar.textContent = initials;
    if (profileAvatar) profileAvatar.textContent = initials;
    if (profileName) profileName.textContent = userName;
    if (profileEmail) profileEmail.textContent = userEmail;

    // Load profile form
    loadProfileForm(user);

    // Verificar se o quiz de onboarding foi completado
    const userProfile = getUserProfile();
    if (!userProfile || !userProfile.quizCompleted) {
        // Mostrar quiz de onboarding
        setTimeout(() => showQuizModal(), 500);
    }
}

// Função auxiliar para obter usuário (API ou localStorage)
function getDashboardUser() {
    // Primeiro verifica se tem usuário da API em cache
    const appData = getAppData();
    if (appData.currentApiUser) {
        return appData.currentApiUser;
    }
    // Fallback para localStorage
    return getCurrentUser();
}

// ============================================
// NAVIGATION
// ============================================
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            switchSection(section);

            // Update active state
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

function switchSection(sectionId) {
    const sections = document.querySelectorAll('.section');
    const pageTitle = document.getElementById('pageTitle');

    sections.forEach(section => {
        section.classList.remove('active');
    });

    const targetSection = document.getElementById(`section-${sectionId}`);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Update page title
    const titles = {
        'overview': 'Visão Geral',
        'recipes': 'Gerador de Receitas',
        'meals': 'Minhas Refeições',
        'progress': 'Meu Progresso',
        'profile': 'Meu Perfil'
    };

    if (pageTitle && titles[sectionId]) {
        pageTitle.textContent = titles[sectionId];
    }

    // Update nav active state
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === sectionId) {
            item.classList.add('active');
        }
    });

    // Close sidebar on mobile
    document.getElementById('sidebar')?.classList.remove('active');
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
}

// ============================================
// LOAD DASHBOARD DATA
// ============================================
function loadDashboardData() {
    const user = getDashboardUser();
    if (!user) return;

    // Calculate days in protocol
    const createdAt = user.createdAt || user.created_at || new Date().toISOString();
    const startDate = new Date(createdAt);
    const today = new Date();
    const days = Math.max(1, Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1);

    // Update stats
    document.getElementById('statDays').textContent = isNaN(days) ? 1 : days;
    document.getElementById('statMeals').textContent = user.meals?.length || 0;
    document.getElementById('statRecipes').textContent = user.recipes?.length || 0;
    document.getElementById('statStreak').textContent = calculateStreak(user);

    // Load recent meals
    loadRecentMeals(user);

    // Load saved recipes
    loadSavedRecipes(user);

    // Load meals grid
    loadMealsGrid(user);

    // Load progress data
    loadProgressData(user);
}

function calculateStreak(user) {
    if (!user.meals || user.meals.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = 0;
    let checkDate = new Date(today);

    while (true) {
        const dateStr = checkDate.toISOString().split('T')[0];
        const hasMeal = user.meals.some(meal => meal.date.startsWith(dateStr));

        if (hasMeal) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }

    return streak;
}

// ============================================
// DAILY TIPS
// ============================================
function loadDailyTip() {
    const tips = [
        "Priorize proteínas de alta qualidade em cada refeição. Carne, peixe e ovos são seus melhores aliados!",
        "Gorduras saudáveis como azeite, abacate e castanhas ajudam seu corpo a absorver vitaminas essenciais.",
        "Evite carboidratos processados. Prefira legumes e vegetais como fonte de fibras e nutrientes.",
        "Hidrate-se! Beba pelo menos 2 litros de água por dia. Chás sem açúcar também contam.",
        "O jejum intermitente pode potencializar seus resultados. Comece com 12 horas e vá aumentando.",
        "Durma bem! O sono de qualidade é essencial para a recuperação e perda de gordura.",
        "Carnes de animais criados a pasto são mais nutritivas. Sempre que possível, escolha qualidade.",
        "Tempere suas refeições com ervas e especiarias naturais. Elas têm propriedades anti-inflamatórias!",
        "Ovos são superalimentos! Rico em proteínas, vitaminas e gorduras boas. Coma a gema também!",
        "Cozinhe em casa sempre que possível. Você controla os ingredientes e economiza dinheiro."
    ];

    const tipElement = document.getElementById('dailyTip');
    if (tipElement) {
        const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
        tipElement.textContent = tips[dayOfYear % tips.length];
    }
}

// ============================================
// RECIPE GENERATOR
// ============================================
function initMethodTabs() {
    const tabs = document.querySelectorAll('.method-tab');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const method = tab.dataset.method;

            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Show corresponding content
            document.getElementById('method-photo').style.display = method === 'photo' ? 'block' : 'none';
            document.getElementById('method-text').style.display = method === 'text' ? 'block' : 'none';
        });
    });
}

function initPhotoUploads() {
    // Ingredient photo upload
    const ingredientPhoto = document.getElementById('ingredientPhoto');
    if (ingredientPhoto) {
        ingredientPhoto.addEventListener('change', handleIngredientPhoto);
    }

    // Meal photo upload
    const mealPhoto = document.getElementById('mealPhoto');
    if (mealPhoto) {
        mealPhoto.addEventListener('change', handleMealPhoto);
    }
}

function handleIngredientPhoto(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const preview = document.getElementById('uploadPreview');
        const previewImage = document.getElementById('previewImage');
        const placeholder = document.querySelector('.upload-placeholder');

        previewImage.src = event.target.result;
        preview.style.display = 'block';
        placeholder.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

function handleMealPhoto(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const preview = document.getElementById('mealPreview');
        const previewImage = document.getElementById('mealPreviewImage');
        const uploadArea = document.querySelector('.meal-photo-upload .upload-area');

        previewImage.src = event.target.result;
        preview.style.display = 'block';
        uploadArea.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

function removePhoto() {
    const preview = document.getElementById('uploadPreview');
    const placeholder = document.querySelector('.upload-placeholder');
    const input = document.getElementById('ingredientPhoto');

    preview.style.display = 'none';
    placeholder.style.display = 'block';
    input.value = '';
}

// Receitas de exemplo organizadas por tipo de refeição - DIETA DA SELVA
const sampleRecipesByMeal = {
    cafe_da_manha: [
        {
            name: "Ovos Mexidos com Bacon e Queijo",
            time: "15min",
            calories: "450kcal",
            protein: "28g",
            mealType: "cafe_da_manha",
            mealTypeName: "Café da Manhã",
            ingredients: [
                "3 ovos caipiras",
                "4 fatias de bacon",
                "50g de queijo minas",
                "1 colher de manteiga",
                "Sal e pimenta a gosto"
            ],
            steps: [
                "Frite o bacon em frigideira até ficar crocante",
                "Bata os ovos com sal e pimenta",
                "Na gordura do bacon, adicione a manteiga",
                "Despeje os ovos e mexa delicadamente",
                "Adicione queijo e bacon picado",
                "Sirva quando os ovos estiverem cremosos"
            ],
            tip: "Os ovos caipiras são mais nutritivos e ricos em ômega-3!"
        },
        {
            name: "Iogurte Natural com Frutas e Mel",
            time: "5min",
            calories: "280kcal",
            protein: "15g",
            mealType: "cafe_da_manha",
            mealTypeName: "Café da Manhã",
            ingredients: [
                "200g de iogurte natural integral",
                "1/2 banana madura",
                "5 morangos frescos",
                "1 colher de mel puro",
                "Canela em pó a gosto"
            ],
            steps: [
                "Coloque o iogurte em uma tigela",
                "Corte as frutas em pedaços",
                "Disponha as frutas sobre o iogurte",
                "Regue com mel puro de abelha",
                "Finalize com canela em pó"
            ],
            tip: "O mel é o único adoçante permitido na Dieta da Selva - use com moderação!"
        }
    ],
    almoco: [
        {
            name: "Bife de Picanha Grelhado na Manteiga",
            time: "20min",
            calories: "580kcal",
            protein: "52g",
            mealType: "almoco",
            mealTypeName: "Almoço",
            ingredients: [
                "300g de picanha",
                "2 colheres de manteiga",
                "Sal grosso a gosto",
                "Pimenta do reino moída",
                "Alho picado (opcional)"
            ],
            steps: [
                "Retire a carne da geladeira 30 min antes",
                "Tempere generosamente com sal grosso",
                "Aqueça a frigideira com manteiga",
                "Grelhe 4-5 min de cada lado (ao ponto)",
                "Adicione mais manteiga e alho no final",
                "Deixe descansar 5 min antes de cortar"
            ],
            tip: "A gordura da picanha é saudável e saborosa - não retire!"
        },
        {
            name: "Frango Assado com Ervas",
            time: "45min",
            calories: "420kcal",
            protein: "48g",
            mealType: "almoco",
            mealTypeName: "Almoço",
            ingredients: [
                "2 sobrecoxas de frango com pele",
                "2 colheres de manteiga derretida",
                "Alecrim e tomilho frescos",
                "4 dentes de alho",
                "Sal e pimenta a gosto"
            ],
            steps: [
                "Tempere o frango com sal, pimenta e ervas",
                "Espalhe manteiga por toda a pele",
                "Disponha os alhos ao redor",
                "Asse a 200°C por 40 minutos",
                "Regue com o molho algumas vezes",
                "Sirva com a pele crocante"
            ],
            tip: "A pele do frango é rica em colágeno - não descarte!"
        }
    ],
    lanche: [
        {
            name: "Queijo com Frutas e Mel",
            time: "5min",
            calories: "320kcal",
            protein: "18g",
            mealType: "lanche",
            mealTypeName: "Lanche da Tarde",
            ingredients: [
                "100g de queijo coalho ou minas",
                "1 maçã pequena fatiada",
                "1 colher de mel",
                "Canela em pó"
            ],
            steps: [
                "Corte o queijo em cubos ou fatias",
                "Fatie a maçã em lâminas finas",
                "Disponha alternando queijo e maçã",
                "Regue com mel",
                "Polvilhe canela por cima"
            ],
            tip: "Combinação perfeita de proteína, gordura e doce natural!"
        },
        {
            name: "Ovos Cozidos com Manteiga",
            time: "12min",
            calories: "220kcal",
            protein: "14g",
            mealType: "lanche",
            mealTypeName: "Lanche da Tarde",
            ingredients: [
                "2 ovos caipiras",
                "1 colher de manteiga",
                "Sal e pimenta a gosto",
                "Ervas finas (opcional)"
            ],
            steps: [
                "Cozinhe os ovos por 8-10 minutos",
                "Coloque em água gelada",
                "Descasque e corte ao meio",
                "Adicione uma noz de manteiga em cada",
                "Tempere com sal e pimenta"
            ],
            tip: "Ovos são o alimento mais completo da natureza!"
        }
    ],
    jantar: [
        {
            name: "Omelete Recheada de Queijo",
            time: "15min",
            calories: "420kcal",
            protein: "32g",
            mealType: "jantar",
            mealTypeName: "Jantar",
            ingredients: [
                "3 ovos",
                "60g de queijo muçarela",
                "1 colher de manteiga",
                "Sal e pimenta a gosto",
                "Orégano a gosto"
            ],
            steps: [
                "Bata os ovos com sal e pimenta",
                "Derreta a manteiga em frigideira média",
                "Despeje os ovos e deixe cozinhar",
                "Quando firmar embaixo, adicione queijo",
                "Dobre ao meio",
                "Sirva com orégano por cima"
            ],
            tip: "Jantar leve e proteico - ideal para boa noite de sono!"
        },
        {
            name: "Salmão Grelhado com Limão",
            time: "18min",
            calories: "380kcal",
            protein: "42g",
            mealType: "jantar",
            mealTypeName: "Jantar",
            ingredients: [
                "200g de filé de salmão",
                "Suco de 1 limão",
                "2 colheres de manteiga",
                "Sal e pimenta a gosto",
                "Endro fresco"
            ],
            steps: [
                "Tempere o salmão com sal e limão",
                "Aqueça a frigideira com manteiga",
                "Grelhe 4 minutos de cada lado",
                "Adicione mais manteiga derretida",
                "Finalize com endro fresco"
            ],
            tip: "Salmão é rico em ômega-3 - excelente para o cérebro!"
        }
    ]
};

// Função para pegar receita baseada no horário
function getSampleRecipeByTime() {
    const hour = new Date().getHours();
    let mealType;

    if (hour >= 5 && hour < 10) {
        mealType = 'cafe_da_manha';
    } else if (hour >= 10 && hour < 14) {
        mealType = 'almoco';
    } else if (hour >= 14 && hour < 18) {
        mealType = 'lanche';
    } else {
        mealType = 'jantar';
    }

    const recipes = sampleRecipesByMeal[mealType];
    return recipes[Math.floor(Math.random() * recipes.length)];
}

let currentRecipe = null;

async function generateRecipe() {
    // Show loading
    const btn = document.querySelector('.input-methods .btn-primary');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span>⏳</span> Gerando receita com IA...';
    btn.disabled = true;

    try {
        // Obter ingredientes do input
        const ingredientText = document.getElementById('ingredientText')?.value || '';
        const previewImage = document.getElementById('previewImage');
        let ingredients = ingredientText;

        // Se tem imagem, tentar analisar com IA
        if (previewImage && previewImage.src && previewImage.src.startsWith('data:')) {
            try {
                if (typeof RecipesAPI !== 'undefined') {
                    const analysis = await RecipesAPI.analyzeImage(previewImage.src);
                    if (analysis.success) {
                        ingredients = analysis.ingredients;
                    }
                }
            } catch (e) {
                console.log('Erro ao analisar imagem:', e);
            }
        }

        // Tenta usar a API do backend
        if (typeof RecipesAPI !== 'undefined' && ingredients.trim()) {
            const mealType = document.getElementById('mealType')?.value || 'any';
            const cookTime = document.getElementById('cookTime')?.value || 'any';

            let preferences = '';
            if (mealType !== 'any') preferences += `Tipo: ${mealType}. `;
            if (cookTime !== 'any') preferences += `Tempo máximo: ${cookTime} minutos.`;

            const response = await RecipesAPI.generate(ingredients, preferences);

            if (response.success && response.recipe) {
                currentRecipe = response.recipe;
            } else {
                throw new Error(response.message || 'Erro ao gerar receita');
            }
        } else {
            throw new Error('Sem ingredientes ou API não disponível');
        }
    } catch (error) {
        // Fallback para receitas estáticas baseadas no horário
        console.log('Usando receitas offline:', error.message);
        currentRecipe = getSampleRecipeByTime();
    }

    // Update UI
    document.getElementById('recipeName').textContent = currentRecipe.name;
    document.getElementById('recipeTime').textContent = currentRecipe.time;
    document.getElementById('recipeCalories').textContent = currentRecipe.calories;
    document.getElementById('recipeProtein').textContent = currentRecipe.protein + ' proteína';

    // Ingredients
    const ingredientsList = document.getElementById('recipeIngredients');
    ingredientsList.innerHTML = currentRecipe.ingredients.map(i => `<li>${i}</li>`).join('');

    // Steps
    const stepsList = document.getElementById('recipeSteps');
    stepsList.innerHTML = currentRecipe.steps.map(s => `<li>${s}</li>`).join('');

    // Tip
    document.getElementById('recipeTip').textContent = currentRecipe.tip;

    // Show result
    document.querySelector('.input-methods').style.display = 'none';
    document.getElementById('generatedRecipe').style.display = 'flex';

    // Reset button
    btn.innerHTML = originalText;
    btn.disabled = false;

    showToast('Receita gerada com sucesso! 🍳');
}

function resetGenerator() {
    document.querySelector('.input-methods').style.display = 'block';
    document.getElementById('generatedRecipe').style.display = 'none';
    removePhoto();
    document.getElementById('ingredientText').value = '';
}

function saveCurrentRecipe() {
    if (!currentRecipe) return;

    const appData = getAppData();
    const user = appData.users.find(u => u.id === appData.currentUser);

    if (!user.recipes) user.recipes = [];

    // Check if already saved
    if (user.recipes.find(r => r.name === currentRecipe.name)) {
        showToast('Receita já está salva!', 'error');
        return;
    }

    user.recipes.push({
        ...currentRecipe,
        savedAt: new Date().toISOString()
    });

    saveAppData(appData);
    loadDashboardData();
    showToast('Receita salva com sucesso! 💾');
}

function loadSavedRecipes(user) {
    const container = document.getElementById('savedRecipesList');
    if (!container) return;

    if (!user.recipes || user.recipes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">🍳</span>
                <p>Nenhuma receita salva ainda</p>
                <button class="btn-primary btn-small" onclick="switchSection('recipes')">
                    Gerar Primeira Receita
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = user.recipes.slice(-3).reverse().map(recipe => `
        <div class="recipe-item">
            <h4>${recipe.name}</h4>
            <span>${recipe.time}</span>
        </div>
    `).join('');
}

// ============================================
// MEALS MANAGEMENT
// ============================================
function initMealFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.dataset.filter;
            filterMeals(filter);
        });
    });
}

function filterMeals(filter) {
    const user = getCurrentUser();
    if (!user) return;

    const meals = filter === 'all'
        ? user.meals
        : user.meals?.filter(m => m.type === filter);

    renderMealsGrid(meals || []);
}

function openMealModal() {
    document.getElementById('mealModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeMealModal() {
    document.getElementById('mealModal').classList.remove('active');
    document.body.style.overflow = '';

    // Reset form
    document.querySelector('.meal-form').reset();
    document.getElementById('mealPreview').style.display = 'none';
    document.querySelector('.meal-photo-upload .upload-area').style.display = 'block';
}

function saveMeal(event) {
    event.preventDefault();

    const name = document.getElementById('mealName').value;
    const type = document.getElementById('mealTypeSelect').value;
    const description = document.getElementById('mealDescription').value;
    const photoPreview = document.getElementById('mealPreviewImage');

    const appData = getAppData();
    const user = appData.users.find(u => u.id === appData.currentUser);

    if (!user.meals) user.meals = [];

    user.meals.push({
        id: Date.now(),
        name,
        type,
        description,
        photo: photoPreview.src || null,
        date: new Date().toISOString()
    });

    saveAppData(appData);
    closeMealModal();
    loadDashboardData();
    showToast('Refeição registrada com sucesso! 📸');
}

function loadRecentMeals(user) {
    const container = document.getElementById('recentMealsList');
    if (!container) return;

    if (!user.meals || user.meals.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📸</span>
                <p>Nenhuma refeição registrada ainda</p>
                <button class="btn-primary btn-small" onclick="switchSection('meals')">
                    Registrar Primeira Refeição
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = user.meals.slice(-3).reverse().map(meal => {
        const mealTypes = {
            'breakfast': '🌅 Café',
            'lunch': '☀️ Almoço',
            'dinner': '🌙 Jantar',
            'snack': '🍎 Lanche'
        };

        return `
            <div class="meal-item">
                <div class="meal-thumb">
                    ${meal.photo ? `<img src="${meal.photo}" alt="${meal.name}">` : '📸'}
                </div>
                <div class="meal-details">
                    <h4>${meal.name}</h4>
                    <span>${mealTypes[meal.type]} • ${formatDate(meal.date)}</span>
                </div>
            </div>
        `;
    }).join('');
}

function loadMealsGrid(user) {
    renderMealsGrid(user.meals || []);
}

function renderMealsGrid(meals) {
    const container = document.getElementById('mealsGrid');
    if (!container) return;

    if (meals.length === 0) {
        container.innerHTML = `
            <div class="empty-state full">
                <span class="empty-icon">📸</span>
                <h3>Nenhuma refeição encontrada</h3>
                <p>Comece a registrar suas refeições para acompanhar seu progresso!</p>
                <button class="btn-primary" onclick="openMealModal()">
                    Registrar Refeição
                </button>
            </div>
        `;
        return;
    }

    const mealTypes = {
        'breakfast': '🌅 Café da Manhã',
        'lunch': '☀️ Almoço',
        'dinner': '🌙 Jantar',
        'snack': '🍎 Lanche'
    };

    container.innerHTML = meals.slice().reverse().map(meal => `
        <div class="meal-card">
            <div class="meal-card-image">
                ${meal.photo ? `<img src="${meal.photo}" alt="${meal.name}">` : '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:3rem;">📸</div>'}
            </div>
            <div class="meal-card-content">
                <h4>${meal.name}</h4>
                <div class="meal-card-meta">
                    <span>${mealTypes[meal.type]}</span>
                    <span>${formatDate(meal.date)}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// ============================================
// PROGRESS TRACKING
// ============================================
function openProgressModal() {
    document.getElementById('progressModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeProgressModal() {
    document.getElementById('progressModal').classList.remove('active');
    document.body.style.overflow = '';
    document.querySelector('.progress-form').reset();
}

function setTodayDate() {
    const dateInput = document.getElementById('progressDate');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
}

function saveProgress(event) {
    event.preventDefault();

    const weight = parseFloat(document.getElementById('progressWeight').value);
    const date = document.getElementById('progressDate').value;
    const notes = document.getElementById('progressNotes').value;

    const appData = getAppData();
    const user = appData.users.find(u => u.id === appData.currentUser);

    if (!user.progress) user.progress = [];

    user.progress.push({
        id: Date.now(),
        weight,
        date,
        notes
    });

    // Update profile weight
    if (!user.profile) user.profile = {};
    user.profile.weight = weight;

    saveAppData(appData);
    closeProgressModal();
    loadDashboardData();
    showToast('Peso registrado com sucesso! 📊');
}

function loadProgressData(user) {
    const progress = user.progress || [];

    // Get weights
    const startWeight = progress.length > 0 ? progress[0].weight : (user.profile?.weight || null);
    const currentWeight = progress.length > 0 ? progress[progress.length - 1].weight : (user.profile?.weight || null);
    const goalWeight = user.profile?.goalWeight || null;

    document.getElementById('startWeight').textContent = startWeight ? startWeight.toFixed(1) : '--';
    document.getElementById('currentWeight').textContent = currentWeight ? currentWeight.toFixed(1) : '--';
    document.getElementById('goalWeight').textContent = goalWeight ? goalWeight.toFixed(1) : '--';

    if (startWeight && currentWeight) {
        const lost = startWeight - currentWeight;
        document.getElementById('totalLost').textContent = lost.toFixed(1);
    }

    // Render history
    renderProgressHistory(progress);

    // Render chart
    renderWeightChart(progress);
}

function renderProgressHistory(progress) {
    const container = document.getElementById('progressHistory');
    if (!container) return;

    if (progress.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Nenhum registro de peso ainda</p></div>';
        return;
    }

    const sorted = [...progress].sort((a, b) => new Date(b.date) - new Date(a.date));

    container.innerHTML = sorted.slice(0, 10).map((entry, index) => {
        let change = 0;
        if (index < sorted.length - 1) {
            change = entry.weight - sorted[index + 1].weight;
        }

        const changeClass = change < 0 ? 'positive' : change > 0 ? 'negative' : '';
        const changeText = change !== 0 ? `${change > 0 ? '+' : ''}${change.toFixed(1)}kg` : '-';

        return `
            <div class="history-item">
                <span class="history-date">${formatDateLong(entry.date)}</span>
                <span class="history-weight">${entry.weight.toFixed(1)} kg</span>
                <span class="history-change ${changeClass}">${changeText}</span>
            </div>
        `;
    }).join('');
}

function renderWeightChart(progress) {
    const container = document.getElementById('weightChart');
    if (!container || progress.length < 2) {
        if (container) {
            container.innerHTML = '<div class="empty-state"><span class="empty-icon">📊</span><p>Registre seu peso para ver o gráfico</p></div>';
        }
        return;
    }

    // Simple SVG chart
    const sorted = [...progress].sort((a, b) => new Date(a.date) - new Date(b.date));
    const weights = sorted.map(p => p.weight);
    const minWeight = Math.min(...weights) - 2;
    const maxWeight = Math.max(...weights) + 2;
    const range = maxWeight - minWeight;

    const width = container.clientWidth || 600;
    const height = 250;
    const padding = 40;

    const points = sorted.map((entry, i) => {
        const x = padding + (i / (sorted.length - 1)) * (width - padding * 2);
        const y = height - padding - ((entry.weight - minWeight) / range) * (height - padding * 2);
        return { x, y, weight: entry.weight, date: entry.date };
    });

    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    container.innerHTML = `
        <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}">
            <!-- Grid lines -->
            ${[0, 25, 50, 75, 100].map(pct => {
        const y = padding + (pct / 100) * (height - padding * 2);
        const weight = (maxWeight - (pct / 100) * range).toFixed(1);
        return `
                    <line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="rgba(255,255,255,0.1)" />
                    <text x="${padding - 5}" y="${y + 4}" fill="#666" font-size="10" text-anchor="end">${weight}</text>
                `;
    }).join('')}
            
            <!-- Line -->
            <path d="${pathData}" fill="none" stroke="url(#lineGradient)" stroke-width="3" />
            
            <!-- Area -->
            <path d="${pathData} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z" 
                  fill="url(#areaGradient)" opacity="0.3" />
            
            <!-- Points -->
            ${points.map(p => `
                <circle cx="${p.x}" cy="${p.y}" r="6" fill="#1B5E20" stroke="#00E676" stroke-width="2" />
            `).join('')}
            
            <!-- Gradients -->
            <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#1B5E20" />
                    <stop offset="100%" stop-color="#00E676" />
                </linearGradient>
                <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#1B5E20" />
                    <stop offset="100%" stop-color="transparent" />
                </linearGradient>
            </defs>
        </svg>
    `;
}

// ============================================
// PROFILE MANAGEMENT
// ============================================
function loadProfileForm(user) {
    // Suporta tanto formato da API (profile separado) quanto localStorage
    const profile = user.profile || user;

    document.getElementById('profileNameInput').value = user.name || '';
    document.getElementById('profileEmailInput').value = user.email || '';
    document.getElementById('profileWeight').value = profile?.weight || '';
    document.getElementById('profileHeight').value = profile?.height || '';
    document.getElementById('profileGoal').value = profile?.goal || 'lose';
    document.getElementById('profileGoalWeight').value = profile?.goalWeight || profile?.goal_weight || '';
}

function saveProfile(event) {
    event.preventDefault();

    const appData = getAppData();
    const user = appData.users.find(u => u.id === appData.currentUser);

    user.name = document.getElementById('profileNameInput').value;
    user.email = document.getElementById('profileEmailInput').value;

    if (!user.profile) user.profile = {};
    user.profile.weight = parseFloat(document.getElementById('profileWeight').value) || null;
    user.profile.height = parseInt(document.getElementById('profileHeight').value) || null;
    user.profile.goal = document.getElementById('profileGoal').value;
    user.profile.goalWeight = parseFloat(document.getElementById('profileGoalWeight').value) || null;

    saveAppData(appData);
    checkDashboardAuth(); // Refresh UI
    loadDashboardData();
    showToast('Perfil atualizado com sucesso! ✅');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function formatDate(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return 'Hoje';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Ontem';
    } else {
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
}

function formatDateLong(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

// ============================================
// QUIZ ONBOARDING
// ============================================
let currentQuizStep = 1;
const totalQuizSteps = 6;
let quizData = {};

// Obter perfil do usuário
function getUserProfile() {
    const user = getDashboardUser();
    if (!user) return null;

    const appData = getAppData();
    if (!appData.userProfiles) appData.userProfiles = {};

    const userId = user.id || user.email;
    return appData.userProfiles[userId] || null;
}

// Salvar perfil do usuário
function saveUserProfile(profile) {
    const user = getDashboardUser();
    if (!user) return;

    const appData = getAppData();
    if (!appData.userProfiles) appData.userProfiles = {};

    const userId = user.id || user.email;
    appData.userProfiles[userId] = profile;
    saveAppData(appData);
}

// Mostrar modal do quiz
function showQuizModal() {
    const modal = document.getElementById('quizModal');
    if (modal) {
        modal.classList.add('active');
        currentQuizStep = 1;
        quizData = {};
        updateQuizUI();
    }
}

// Esconder modal do quiz
function hideQuizModal() {
    const modal = document.getElementById('quizModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Atualizar UI do quiz
function updateQuizUI() {
    // Atualizar steps visíveis
    document.querySelectorAll('.quiz-step').forEach(step => {
        step.classList.remove('active');
    });

    const currentStep = document.querySelector(`.quiz-step[data-step="${currentQuizStep}"]`);
    if (currentStep) {
        currentStep.classList.add('active');
    }

    // Atualizar barra de progresso
    const progress = (currentQuizStep / totalQuizSteps) * 100;
    const progressBar = document.getElementById('quizProgress');
    const progressText = document.getElementById('quizProgressText');

    if (progressBar) progressBar.style.width = `${progress}%`;
    if (progressText) {
        if (currentQuizStep <= totalQuizSteps) {
            progressText.textContent = `Pergunta ${currentQuizStep} de ${totalQuizSteps}`;
        } else {
            progressText.textContent = 'Concluído!';
        }
    }

    // Atualizar botões
    const prevBtn = document.getElementById('quizPrevBtn');
    const nextBtn = document.getElementById('quizNextBtn');
    const footer = document.getElementById('quizFooter');

    if (prevBtn) {
        prevBtn.style.display = currentQuizStep > 1 && currentQuizStep <= totalQuizSteps ? 'block' : 'none';
    }

    if (nextBtn) {
        if (currentQuizStep === totalQuizSteps) {
            nextBtn.textContent = 'Ver Resultado →';
        } else if (currentQuizStep > totalQuizSteps) {
            // Esconder footer na tela de resultado
            if (footer) footer.style.display = 'none';
        } else {
            nextBtn.textContent = 'Próximo →';
        }
    }
}

// Próximo passo do quiz
function nextQuizStep() {
    // Validar e coletar dados do passo atual
    if (!validateAndCollectQuizStep()) {
        return;
    }

    currentQuizStep++;

    if (currentQuizStep > totalQuizSteps) {
        // Mostrar resultado
        showQuizResult();
    }

    updateQuizUI();
}

// Passo anterior do quiz
function prevQuizStep() {
    if (currentQuizStep > 1) {
        currentQuizStep--;
        updateQuizUI();
    }
}

// Validar e coletar dados do passo
function validateAndCollectQuizStep() {
    switch (currentQuizStep) {
        case 1: // Objetivo
            const goal = document.querySelector('input[name="goal"]:checked');
            if (!goal) {
                showToast('Por favor, selecione seu objetivo', 'error');
                return false;
            }
            quizData.goal = goal.value;
            break;

        case 2: // Experiência
            const experience = document.querySelector('input[name="experience"]:checked');
            if (!experience) {
                showToast('Por favor, selecione sua experiência', 'error');
                return false;
            }
            quizData.experience = experience.value;
            break;

        case 3: // Peso
            const weight = document.getElementById('quizWeight')?.value;
            const goalWeight = document.getElementById('quizGoalWeight')?.value;
            const height = document.getElementById('quizHeight')?.value;

            if (!weight) {
                showToast('Por favor, informe seu peso atual', 'error');
                return false;
            }

            quizData.weight = parseFloat(weight);
            quizData.goalWeight = goalWeight ? parseFloat(goalWeight) : null;
            quizData.height = height ? parseInt(height) : null;
            break;

        case 4: // Proteínas favoritas
            const proteins = document.querySelectorAll('input[name="proteins"]:checked');
            quizData.favoriteProteins = Array.from(proteins).map(p => p.value);
            break;

        case 5: // Restrições
            const restrictions = document.querySelectorAll('input[name="restrictions"]:checked');
            quizData.restrictions = Array.from(restrictions).map(r => r.value);
            break;

        case 6: // Rotina
            const routine = document.querySelector('input[name="routine"]:checked');
            if (!routine) {
                showToast('Por favor, selecione sua rotina', 'error');
                return false;
            }
            quizData.routine = routine.value;
            break;
    }

    return true;
}

// Mostrar resultado do quiz
function showQuizResult() {
    // Calcular perfil com base nas respostas
    const profile = calculateProfile();

    // Renderizar resumo
    const summaryContainer = document.getElementById('profileSummary');
    if (summaryContainer) {
        summaryContainer.innerHTML = `
            <div class="summary-item">
                <span class="summary-icon">🎯</span>
                <div>
                    <div class="summary-label">Seu Objetivo</div>
                    <div class="summary-value">${profile.goalText}</div>
                </div>
            </div>
            <div class="summary-item">
                <span class="summary-icon">📊</span>
                <div>
                    <div class="summary-label">Nível</div>
                    <div class="summary-value">${profile.levelText}</div>
                </div>
            </div>
            <div class="summary-item">
                <span class="summary-icon">⚖️</span>
                <div>
                    <div class="summary-label">Meta de Peso</div>
                    <div class="summary-value">${profile.weightGoalText}</div>
                </div>
            </div>
            <div class="summary-item">
                <span class="summary-icon">🍽️</span>
                <div>
                    <div class="summary-label">Rotina</div>
                    <div class="summary-value">${profile.routineText}</div>
                </div>
            </div>
            <div class="summary-item">
                <span class="summary-icon">🥩</span>
                <div>
                    <div class="summary-label">Proteínas Favoritas</div>
                    <div class="summary-value">${profile.proteinsText}</div>
                </div>
            </div>
        `;
    }

    // Esconder header de progresso
    const quizHeader = document.querySelector('.quiz-header');
    if (quizHeader) {
        quizHeader.innerHTML = `
            <span class="quiz-icon">✨</span>
            <h2>Perfil Configurado!</h2>
            <p>Sua experiência foi personalizada com base nas suas respostas</p>
        `;
    }

    // Mostrar step de resultado
    document.querySelectorAll('.quiz-step').forEach(step => {
        step.classList.remove('active');
    });
    const resultStep = document.querySelector('.quiz-step[data-step="result"]');
    if (resultStep) {
        resultStep.classList.add('active');
    }
}

// Calcular perfil com base nas respostas
function calculateProfile() {
    const goalTexts = {
        'lose_weight': 'Perder peso',
        'gain_muscle': 'Ganhar massa muscular',
        'health': 'Melhorar a saúde',
        'energy': 'Mais energia e disposição'
    };

    const experienceTexts = {
        'beginner': '🌱 Iniciante',
        'intermediate': '🌿 Intermediário',
        'advanced': '🌳 Avançado'
    };

    const routineTexts = {
        'regular': 'Horários regulares',
        'flexible': 'Flexível',
        'intermittent': 'Jejum intermitente',
        'frequent': 'Várias refeições ao dia'
    };

    const proteinNames = {
        'beef': 'Carne bovina',
        'chicken': 'Frango',
        'pork': 'Porco/Bacon',
        'fish': 'Peixes',
        'eggs': 'Ovos',
        'cheese': 'Queijos'
    };

    // Calcular meta de peso
    let weightGoalText = 'Não definido';
    if (quizData.weight && quizData.goalWeight) {
        const diff = quizData.weight - quizData.goalWeight;
        if (diff > 0) {
            weightGoalText = `${quizData.weight}kg → ${quizData.goalWeight}kg (-${diff.toFixed(1)}kg)`;
        } else if (diff < 0) {
            weightGoalText = `${quizData.weight}kg → ${quizData.goalWeight}kg (+${Math.abs(diff).toFixed(1)}kg)`;
        } else {
            weightGoalText = `Manter ${quizData.weight}kg`;
        }
    } else if (quizData.weight) {
        weightGoalText = `Peso atual: ${quizData.weight}kg`;
    }

    // Proteínas favoritas
    const proteinsText = quizData.favoriteProteins && quizData.favoriteProteins.length > 0
        ? quizData.favoriteProteins.map(p => proteinNames[p] || p).join(', ')
        : 'Todas as proteínas';

    return {
        goalText: goalTexts[quizData.goal] || 'Não definido',
        levelText: experienceTexts[quizData.experience] || 'Não definido',
        weightGoalText,
        routineText: routineTexts[quizData.routine] || 'Não definido',
        proteinsText
    };
}

// Completar quiz e salvar perfil
function completeQuiz() {
    // Montar perfil completo
    const profile = {
        quizCompleted: true,
        completedAt: new Date().toISOString(),
        goal: quizData.goal,
        experience: quizData.experience,
        weight: quizData.weight,
        goalWeight: quizData.goalWeight,
        height: quizData.height,
        favoriteProteins: quizData.favoriteProteins || [],
        restrictions: quizData.restrictions || [],
        routine: quizData.routine
    };

    // Salvar perfil
    saveUserProfile(profile);

    // Atualizar dados do usuário no localStorage também
    const user = getDashboardUser();
    if (user) {
        const appData = getAppData();
        const userIndex = appData.users?.findIndex(u => u.id === user.id || u.email === user.email);
        if (userIndex !== undefined && userIndex >= 0 && appData.users[userIndex]) {
            appData.users[userIndex].profile = profile;
            saveAppData(appData);
        }
    }

    // Fechar modal
    hideQuizModal();

    // Atualizar dashboard
    loadDashboardData();

    // Mostrar mensagem de sucesso
    showToast('Perfil configurado com sucesso! Bem-vindo ao Protocolo Selva! 🌿');
}
