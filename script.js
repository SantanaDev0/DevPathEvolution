const API_URL = 'http://localhost:3001/api';

// DOM Elements
const elements = {
    input: document.getElementById('objetivo-input'),
    btnGerar: document.getElementById('btn-gerar'),
    btnReset: document.getElementById('btn-reset'),
    hero: document.getElementById('hero'),
    roadmapSection: document.getElementById('roadmap-section'),
    roadmapContainer: document.getElementById('roadmap-container'),
    roadmapTitle: document.getElementById('roadmap-title'),
    roadmapTime: document.getElementById('roadmap-time'),
    progressFill: document.getElementById('progress-fill'),
    progressText: document.getElementById('progress-text'),
    loader: document.querySelector('.loader'),
    btnText: document.querySelector('.btn-primary .btn-text'),
    
    // Stats & Chart
    userStats: document.getElementById('user-stats'),
    userXp: document.getElementById('user-xp'),
    userLevel: document.getElementById('user-level'),
    userStreak: document.getElementById('user-streak'),
    toastContainer: document.getElementById('toast-container'),
    chartContainer: document.getElementById('chart-container'),
    canvas: document.getElementById('xp-chart'),
    
    // Time Estimation
    hoursInput: document.getElementById('hours-per-week'),
    realTimeEstimate: document.getElementById('real-time-estimate'),

    // Modal
    modal: document.getElementById('tech-modal'),
    modalTitle: document.getElementById('modal-title'),
    modalBody: document.getElementById('modal-body'),
    modalLoader: document.getElementById('modal-loader'),
    projectsList: document.getElementById('projects-list'),
    resourcesList: document.getElementById('resources-list')
};

// State
let currentRoadmap = null;
let userProfile = {
    xp: 0,
    level: 1,
    streak: 0,
    lastLogin: null,
    achievements: [],
    xpHistory: [] // Histórico para o gráfico
};

const ACHIEVEMENTS = [
    { id: "first_roadmap", nome: "Visionário", descricao: "Gerou seu primeiro roadmap", icon: "🗺️", xp: 100 },
    { id: "first_tech", nome: "Hello World", descricao: "Primeira tecnologia concluída", icon: "👋", xp: 50 },
    { id: "step_master", nome: "Passo Firme", descricao: "Concluiu uma etapa inteira", icon: "👣", xp: 300 },
    { id: "halfway", nome: "Meio Caminho", descricao: "50% do roadmap concluído", icon: "🔥", xp: 500 },
    { id: "completed", nome: "Lenda Tech", descricao: "Roadmap 100% concluído", icon: "🏆", xp: 1000 },
    { id: "streak_3", nome: "Focado", descricao: "3 dias seguidos de foco", icon: "⚡", xp: 150 }
];

// Init
document.addEventListener('DOMContentLoaded', () => {
    loadUserProfile();
    loadFromLocalStorage();
    checkStreak();
    updateStatsUI();
    drawXPChart(); // Desenhar gráfico inicial
    
    // Event listener para cálculo de horas
    if(elements.hoursInput) {
        elements.hoursInput.addEventListener('change', recalculateTime);
        elements.hoursInput.addEventListener('keyup', recalculateTime);
    }
});

// Event Listeners Globais
elements.btnGerar.addEventListener('click', gerarRoadmap);
if (elements.btnReset) elements.btnReset.addEventListener('click', resetRoadmap);
elements.input.addEventListener('keypress', (e) => { if (e.key === 'Enter') gerarRoadmap(); });

window.setInput = (text) => {
    elements.input.value = text;
    elements.input.focus();
};

// --- CORE FUNCTIONS ---

async function gerarRoadmap() {
    const objetivo = elements.input.value.trim();
    if (!objetivo) return;

    setLoading(true);

    try {
        const response = await fetch(`${API_URL}/gerar-roadmap`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ objetivo })
        });

        if (!response.ok) throw new Error('Erro ao gerar roadmap');

        const roadmap = await response.json();
        
        // Normalizar dados
        roadmap.etapas.forEach(etapa => {
            etapa.tecnologias.forEach(tech => {
                tech.completed = false;
            });
        });

        saveToLocalStorage(roadmap);
        renderRoadmap(roadmap);
        unlockAchievement('first_roadmap');

    } catch (error) {
        console.error(error);
        alert('Erro ao gerar roadmap. Tente novamente.');
    } finally {
        setLoading(false);
    }
}

function renderRoadmap(roadmap) {
    currentRoadmap = roadmap;
    
    elements.roadmapTitle.textContent = `Roadmap: ${roadmap.objetivo}`;
    elements.roadmapTime.textContent = `⏱️ Estimativa base: ${roadmap.tempo_total_estimado}`;
    
    // UI Transitions
    elements.hero.classList.add('collapsed');
    elements.chartContainer.classList.add('hidden'); // Esconder gráfico ao ver roadmap
    elements.roadmapSection.classList.remove('hidden');
    elements.userStats.classList.remove('hidden');
    
    elements.roadmapContainer.innerHTML = '';

    roadmap.etapas.forEach((etapa, index) => {
        const stepEl = createStepElement(etapa, index);
        elements.roadmapContainer.appendChild(stepEl);
    });

    updateProgress();
    recalculateTime(); // Calcular tempo real inicial
}

function createStepElement(etapa, index) {
    const div = document.createElement('div');
    div.className = 'step-card';
    div.innerHTML = `
        <div class="step-number">${index + 1}</div>
        <div class="step-header">
            <h3>${etapa.nome}</h3>
            <p class="step-desc">${etapa.descricao}</p>
        </div>
        <div class="tech-grid">
            ${etapa.tecnologias.map((tech, techIndex) => createTechItem(tech, index, techIndex)).join('')}
        </div>
    `;
    return div;
}

function createTechItem(tech, stepIndex, techIndex) {
    // ATUALIZADO: Botões agora usam as classes "ghost" e "docs" do novo CSS
    return `
        <div class="tech-item ${tech.completed ? 'completed' : ''}">
            <div class="tech-content" onclick="toggleTech(${stepIndex}, ${techIndex})">
                <div class="tech-header">
                    <span class="tech-name">${tech.nome}</span>
                    <span class="badge ${tech.importancia}">${tech.importancia}</span>
                </div>
                <p style="font-size: 0.9rem; color: #cbd5e1; margin-bottom: 5px;">${tech.descricao}</p>
                <span class="tech-time">⏱️ ${tech.tempo_estimado}</span>
            </div>
            
            <div class="tech-actions">
                <button class="btn-sm ghost" onclick="openTechModal('${tech.nome}', event)">
                    💡 Desafios
                </button>
            </div>
        </div>
    `;
}

window.toggleTech = (stepIndex, techIndex) => {
    if (!currentRoadmap) return;
    
    const tech = currentRoadmap.etapas[stepIndex].tecnologias[techIndex];
    tech.completed = !tech.completed;
    
    if (tech.completed) {
        addXP(20);
        unlockAchievement('first_tech');
    } else {
        addXP(-20);
    }
    
    saveToLocalStorage(currentRoadmap);
    renderRoadmap(currentRoadmap);
    checkProgressAchievements();
};

// --- TIME ESTIMATION FEATURE ---

function recalculateTime() {
    if (!currentRoadmap) return;
    
    const hoursPerWeek = parseInt(elements.hoursInput.value) || 10;
    const baseWeeks = parseDurationToWeeks(currentRoadmap.tempo_total_estimado);
    
    // Assume que o roadmap base foi calculado pensando em ~15h/semana
    const standardLoad = 15; 
    const factor = standardLoad / hoursPerWeek;
    
    const realWeeks = Math.ceil(baseWeeks * factor);
    const months = (realWeeks / 4).toFixed(1);
    
    elements.realTimeEstimate.textContent = `📅 Previsão Real: ~${realWeeks} semanas (${months} meses) estudando ${hoursPerWeek}h/sem`;
}

function parseDurationToWeeks(durationString) {
    if(!durationString) return 8;
    const str = durationString.toLowerCase();
    let number = parseInt(str.match(/\d+/)?.[0]) || 6;
    
    if (str.includes('mês') || str.includes('meses')) return number * 4;
    if (str.includes('ano')) return number * 52;
    return number; 
}

// --- PROJECT & RESOURCE GENERATOR ---

async function gerarDesafios(techName) {
    const response = await fetch(`${API_URL}/gerar-desafios`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            techName: techName,
        })
    });

    if (!response.ok) {
        throw new Error('Erro ao gerar desafios');
    }

    return await response.json();
}

window.openTechModal = async (techName, event) => {
    if(event) event.stopPropagation();
    
    elements.modal.classList.remove('hidden');
    elements.modalTitle.textContent = techName;
    elements.modalLoader.classList.remove('hidden');
    elements.modalBody.classList.add('hidden');
    elements.projectsList.innerHTML = '';
    elements.resourcesList.innerHTML = '';

    const cacheKey = `devpath_challenges_${techName.toLowerCase().replace(/\s/g, '')}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
        renderModalContent(JSON.parse(cached));
    } else {
        try {
            const data = await gerarDesafios(techName);
            localStorage.setItem(cacheKey, JSON.stringify(data));
            renderModalContent(data);
        } catch (error) {
            console.error(error);
            elements.projectsList.innerHTML = '<p style="color:white">Erro ao carregar sugestões.</p>';
            elements.modalLoader.classList.add('hidden');
            elements.modalBody.classList.remove('hidden');
        }
    }
};

function renderModalContent(data) {
    elements.modalLoader.classList.add('hidden');
    elements.modalBody.classList.remove('hidden');

    elements.projectsList.innerHTML = '';
    
    data.projetos.forEach(proj => {
        const projectCard = document.createElement('div');
        projectCard.className = 'project-card';
        projectCard.setAttribute('data-level', proj.nivel.toLowerCase());

        const projectLevel = document.createElement('span');
        projectLevel.className = 'project-level';
        projectLevel.innerText = proj.nivel;

        const projectName = document.createElement('h4');
        projectName.innerText = proj.nome;

        const projectDescription = document.createElement('p');
        projectDescription.innerText = proj.descricao;

        projectCard.appendChild(projectLevel);
        projectCard.appendChild(projectName);
        projectCard.appendChild(projectDescription);

        elements.projectsList.appendChild(projectCard);
    });
    
    elements.resourcesList.innerHTML = '';
}

window.closeModal = () => {
    elements.modal.classList.add('hidden');
};

// --- VISUAL GRAPH ---

function trackXPHistory() {
    const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    
    if (!userProfile.xpHistory) userProfile.xpHistory = [];
    
    const lastEntry = userProfile.xpHistory[userProfile.xpHistory.length - 1];
    
    if (lastEntry && lastEntry.date === today) {
        lastEntry.xp = userProfile.xp;
    } else {
        userProfile.xpHistory.push({ date: today, xp: userProfile.xp });
        if(userProfile.xpHistory.length > 14) userProfile.xpHistory.shift();
    }
}

function drawXPChart() {
    const ctx = elements.canvas.getContext('2d');
    const width = elements.canvas.width;
    const height = elements.canvas.height;
    const history = userProfile.xpHistory || [];
    
    ctx.clearRect(0, 0, width, height);
    
    if (history.length < 2) {
        if(history.length === 0) {
           ctx.font = "14px Outfit";
           ctx.fillStyle = "#94a3b8";
           ctx.textAlign = "center";
           ctx.fillText("Complete tarefas para ver sua evolução aqui!", width/2, height/2);
           return;
        }
    }

    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    const maxXp = Math.max(...history.map(d => d.xp)) * 1.2 || 100;
    
    // Eixos
    ctx.beginPath();
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1;
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Linha do Gráfico
    ctx.beginPath();
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 3;
    
    history.forEach((point, index) => {
        const x = padding + (index / (history.length - 1 || 1)) * chartWidth;
        const y = (height - padding) - (point.xp / maxXp) * chartHeight;
        
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();
    
    // Gradiente
    ctx.lineTo(width - padding, height - padding);
    ctx.lineTo(padding, height - padding);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "rgba(59, 130, 246, 0.3)");
    gradient.addColorStop(1, "rgba(59, 130, 246, 0)");
    ctx.fillStyle = gradient;
    ctx.fill();

    // Pontos
    history.forEach((point, index) => {
        const x = padding + (index / (history.length - 1 || 1)) * chartWidth;
        const y = (height - padding) - (point.xp / maxXp) * chartHeight;

        ctx.fillStyle = "#60a5fa";
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#94a3b8";
        ctx.font = "10px Outfit";
        ctx.textAlign = "center";
        ctx.fillText(point.date, x, height - padding + 15);
    });
}

// --- HELPERS ---

function addXP(amount) {
    userProfile.xp += amount;
    if (userProfile.xp < 0) userProfile.xp = 0;
    
    const newLevel = Math.floor(1 + Math.sqrt(userProfile.xp / 100));
    
    if (newLevel > userProfile.level) {
        userProfile.level = newLevel;
        showToast({ nome: "Level Up!", descricao: `Você alcançou o nível ${newLevel}!`, icon: "🆙", xp: 0 });
    } else {
        userProfile.level = newLevel;
    }
    
    trackXPHistory();
    saveUserProfile();
    drawXPChart();
}

function updateStatsUI() {
    elements.userXp.textContent = `${userProfile.xp} XP`;
    elements.userLevel.textContent = `Lvl ${userProfile.level}`;
    elements.userStreak.textContent = userProfile.streak;
}

function checkStreak() {
    const today = new Date().toDateString();
    if (userProfile.lastLogin !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (userProfile.lastLogin === yesterday.toDateString()) {
            userProfile.streak++;
        } else {
            userProfile.streak = 1;
        }
        
        userProfile.lastLogin = today;
        saveUserProfile();
        if (userProfile.streak === 3) unlockAchievement('streak_3');
    }
}

function unlockAchievement(id) {
    if (userProfile.achievements.includes(id)) return;
    const achievement = ACHIEVEMENTS.find(a => a.id === id);
    if (achievement) {
        userProfile.achievements.push(id);
        addXP(achievement.xp);
        showToast(achievement);
        saveUserProfile();
    }
}

function updateProgress() {
    if (!currentRoadmap) return 0;
    let total = 0, completed = 0;
    currentRoadmap.etapas.forEach(etapa => {
        etapa.tecnologias.forEach(tech => {
            total++;
            if (tech.completed) completed++;
        });
    });
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    elements.progressFill.style.width = `${percentage}%`;
    elements.progressText.textContent = `${percentage}% Concluído`;
    
    if (percentage >= 50) unlockAchievement('halfway');
    if (percentage >= 100) unlockAchievement('completed');
    
    return percentage;
}

function checkProgressAchievements() {
    updateProgress();
    currentRoadmap.etapas.forEach(etapa => {
        const allCompleted = etapa.tecnologias.every(t => t.completed);
        if (allCompleted && etapa.tecnologias.length > 0) unlockAchievement('step_master');
    });
}

function showToast(achievement) {
    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.innerHTML = `
        <div class="achievement-icon">${achievement.icon}</div>
        <div class="achievement-info">
            <h4>${achievement.nome}</h4>
            <p>${achievement.descricao}</p>
        </div>
        ${achievement.xp > 0 ? `<span style="color:#4ade80; font-weight:bold">+${achievement.xp} XP</span>` : ''}
    `;
    elements.toastContainer.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

function saveToLocalStorage(roadmap) {
    localStorage.setItem('devpath_roadmap', JSON.stringify(roadmap));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('devpath_roadmap');
    if (saved) renderRoadmap(JSON.parse(saved));
}

function loadUserProfile() {
    const savedProfile = localStorage.getItem('devpath_profile');
    if (savedProfile) {
        userProfile = JSON.parse(savedProfile);
        if(!userProfile.xpHistory) userProfile.xpHistory = []; // Compatibilidade
    }
}

function saveUserProfile() {
    localStorage.setItem('devpath_profile', JSON.stringify(userProfile));
    updateStatsUI();
}

function resetRoadmap() {
    if (confirm('Tem certeza? Isso apagará seu progresso atual.')) {
        localStorage.removeItem('devpath_roadmap');
        location.reload();
    }
}

function setLoading(isLoading) {
    if (isLoading) {
        elements.loader.classList.remove('hidden');
        elements.btnText.textContent = 'Gerando...';
        elements.btnGerar.disabled = true;
    } else {
        elements.loader.classList.add('hidden');
        elements.btnText.textContent = 'Gerar Roadmap';
        elements.btnGerar.disabled = false;
    }
}