// ============================================
// PROTOCOLO SELVA - Main Application
// ============================================

// User data storage
const APP_STORAGE_KEY = 'protocolo_selva_data';

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initParticles();
    checkAuthStatus();
});

// ============================================
// NAVBAR FUNCTIONALITY
// ============================================
function initNavbar() {
    const navbar = document.getElementById('navbar');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    mobileMenu.classList.toggle('active');
}

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// ============================================
// PARTICLES ANIMATION
// ============================================
function initParticles() {
    const container = document.getElementById('heroParticles');
    if (!container) return;

    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: absolute;
            width: ${Math.random() * 4 + 2}px;
            height: ${Math.random() * 4 + 2}px;
            background: rgba(255, 179, 0, ${Math.random() * 0.3 + 0.1});
            border-radius: 50%;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation: floatParticle ${Math.random() * 5 + 5}s ease-in-out infinite;
            animation-delay: ${Math.random() * 5}s;
        `;
        container.appendChild(particle);
    }

    // Add particle animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes floatParticle {
            0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.5; }
            25% { transform: translate(20px, -30px) scale(1.2); opacity: 0.8; }
            50% { transform: translate(-10px, -50px) scale(0.8); opacity: 0.3; }
            75% { transform: translate(30px, -20px) scale(1.1); opacity: 0.6; }
        }
    `;
    document.head.appendChild(style);
}

// ============================================
// MODAL FUNCTIONALITY
// ============================================
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function switchModal(fromModalId, toModalId) {
    closeModal(fromModalId);
    setTimeout(() => openModal(toModalId), 200);
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    }
});

// ============================================
// FAQ FUNCTIONALITY
// ============================================
function toggleFaq(button) {
    const faqItem = button.parentElement;
    const isActive = faqItem.classList.contains('active');

    // Close all FAQs
    document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('active');
    });

    // Toggle current
    if (!isActive) {
        faqItem.classList.add('active');
    }
}

// ============================================
// TOAST NOTIFICATION
// ============================================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = toast.querySelector('.toast-icon');

    toastMessage.textContent = message;

    if (type === 'success') {
        toastIcon.textContent = '✓';
        toastIcon.style.background = 'rgba(0, 230, 118, 0.2)';
        toastIcon.style.color = '#00E676';
    } else if (type === 'error') {
        toastIcon.textContent = '✗';
        toastIcon.style.background = 'rgba(255, 82, 82, 0.2)';
        toastIcon.style.color = '#FF5252';
    }

    toast.classList.add('active');

    setTimeout(() => {
        toast.classList.remove('active');
    }, 4000);
}

// ============================================
// DATA STORAGE
// ============================================
function getAppData() {
    const data = localStorage.getItem(APP_STORAGE_KEY);
    return data ? JSON.parse(data) : { users: [], currentUser: null };
}

function saveAppData(data) {
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(data));
}

// ============================================
// AUTHENTICATION
// ============================================
async function handleRegister(event) {
    event.preventDefault();

    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Criando conta...';
    submitBtn.disabled = true;

    try {
        // Tenta usar a API do backend
        if (typeof AuthAPI !== 'undefined') {
            const response = await AuthAPI.register(name, email, password);

            closeModal('registerModal');
            showToast(`Bem-vindo ao Protocolo Selva, ${name}! 🌿`);

            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } else {
            throw new Error('API não disponível');
        }
    } catch (error) {
        // Fallback para localStorage
        console.log('Usando localStorage como fallback:', error.message);

        const appData = getAppData();

        if (appData.users.find(u => u.email === email)) {
            showToast('Este email já está cadastrado!', 'error');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            return;
        }

        const newUser = {
            id: Date.now(),
            name,
            email,
            password,
            createdAt: new Date().toISOString(),
            profile: {
                weight: null,
                height: null,
                goal: null,
                level: 'iniciante'
            },
            meals: [],
            recipes: [],
            progress: []
        };

        appData.users.push(newUser);
        appData.currentUser = newUser.id;
        saveAppData(appData);

        closeModal('registerModal');
        showToast(`Bem-vindo ao Protocolo Selva, ${name}! 🌿`);

        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
    }

    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
}

async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Entrando...';
    submitBtn.disabled = true;

    try {
        // Tenta usar a API do backend
        if (typeof AuthAPI !== 'undefined') {
            const response = await AuthAPI.login(email, password);

            closeModal('loginModal');
            showToast(`Bem-vindo de volta, ${response.user.name}! 🌿`);

            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } else {
            throw new Error('API não disponível');
        }
    } catch (error) {
        // Fallback para localStorage
        console.log('Usando localStorage como fallback:', error.message);

        const appData = getAppData();
        const user = appData.users.find(u => u.email === email && u.password === password);

        if (!user) {
            showToast(error.message || 'Email ou senha incorretos!', 'error');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            return;
        }

        appData.currentUser = user.id;
        saveAppData(appData);

        closeModal('loginModal');
        showToast(`Bem-vindo de volta, ${user.name}! 🌿`);

        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
    }

    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
}

function logout() {
    // Limpa token da API
    if (typeof AuthAPI !== 'undefined') {
        AuthAPI.logout();
    }

    // Limpa localStorage
    const appData = getAppData();
    appData.currentUser = null;
    appData.currentApiUser = null;  // Limpa cache do usuário da API
    saveAppData(appData);

    window.location.href = 'index.html';
}

function checkAuthStatus() {
    // Verifica se está autenticado via API ou localStorage
    const isAPIAuth = typeof AuthAPI !== 'undefined' && AuthAPI.isAuthenticated();
    const appData = getAppData();

    if (isAPIAuth || appData.currentUser) {
        // Update nav buttons if on homepage
        const navButtons = document.querySelector('.nav-buttons');
        if (navButtons) {
            if (isAPIAuth) {
                navButtons.innerHTML = `
                    <a href="dashboard.html" class="btn-ghost">Meu Dashboard</a>
                    <button class="btn-primary" onclick="logout()">Sair</button>
                `;
            } else {
                const user = appData.users.find(u => u.id === appData.currentUser);
                if (user) {
                    navButtons.innerHTML = `
                        <a href="dashboard.html" class="btn-ghost">Meu Dashboard</a>
                        <button class="btn-primary" onclick="logout()">Sair</button>
                    `;
                }
            }
        }
    }
}

function getCurrentUser() {
    const appData = getAppData();
    if (!appData.currentUser) return null;
    return appData.users.find(u => u.id === appData.currentUser);
}

// ============================================
// NEWSLETTER
// ============================================
function subscribeNewsletter(event) {
    event.preventDefault();
    const form = event.target;
    const email = form.querySelector('input[type="email"]').value;

    showToast('Inscrição realizada com sucesso! 🎉');
    form.reset();
}

// ============================================
// SMOOTH SCROLL FOR ALL ANCHOR LINKS
// ============================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});
