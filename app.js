const API_URL = 'http://127.0.0.1:5000/api';

// --- i18n Dicionário ---
const translations = {
    'pt-br': {
        'menu_dashboard': 'Dashboard',
        'menu_produtos': 'Produtos',
        'menu_movimentacoes': 'Movimentações',
        'menu_config': 'Configurações',
        'btn_logout': 'Sair',
        'config_title': 'Configurações',
        'config_theme': 'Tema',
        'config_theme_label': 'Escolha o modo de exibição:',
        'theme_dark': 'Modo Escuro',
        'theme_light': 'Modo Claro',
        'config_lang': 'Idioma',
        'config_lang_label': 'Escolha o idioma do sistema:',
        'login_subtitle': 'Faça login para acessar o sistema',
        'email_label': 'E-mail',
        'password_label': 'Senha',
        'login_btn': 'Entrar'
    },
    'en': {
        'menu_dashboard': 'Dashboard',
        'menu_produtos': 'Products',
        'menu_movimentacoes': 'Movements',
        'menu_config': 'Settings',
        'btn_logout': 'Logout',
        'config_title': 'Settings',
        'config_theme': 'Theme',
        'config_theme_label': 'Choose display mode:',
        'theme_dark': 'Dark Mode',
        'theme_light': 'Light Mode',
        'config_lang': 'Language',
        'config_lang_label': 'Choose system language:',
        'login_subtitle': 'Login to access the system',
        'email_label': 'Email',
        'password_label': 'Password',
        'login_btn': 'Login'
    }
};

function applyTranslations(lang) {
    const dict = translations[lang] || translations['pt-br'];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) {
            // Se tiver ícone dentro, preserva o ícone
            const icon = el.querySelector('i');
            if(icon) {
                el.innerHTML = '';
                el.appendChild(icon);
                el.appendChild(document.createTextNode(' ' + dict[key]));
            } else {
                el.textContent = dict[key];
            }
        }
    });
}

function initSettings() {
    const themeSel = document.getElementById('theme-selector');
    const langSel = document.getElementById('lang-selector');
    if(!themeSel || !langSel) return;

    const savedTheme = localStorage.getItem('theme') || 'dark';
    const savedLang = localStorage.getItem('lang') || 'pt-br';

    themeSel.value = savedTheme;
    langSel.value = savedLang;

    if (savedTheme === 'light') document.body.classList.add('light-mode');
    applyTranslations(savedLang);

    themeSel.addEventListener('change', (e) => {
        const val = e.target.value;
        localStorage.setItem('theme', val);
        if (val === 'light') document.body.classList.add('light-mode');
        else document.body.classList.remove('light-mode');
    });

    langSel.addEventListener('change', (e) => {
        const val = e.target.value;
        localStorage.setItem('lang', val);
        applyTranslations(val);
    });
}

// Global fetch options para mandar cookies
const fetchOpts = { credentials: 'include' };

// --- AUTH ---
async function checkAuth() {
    // Se for página de login, tenta fazer login e não checa /me da mesma forma
    if (document.getElementById('login-form')) {
        initSettings(); // Aplica tema e i18n na tela de login
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const senha = document.getElementById('senha').value;
            const errorDiv = document.getElementById('login-error');
            errorDiv.textContent = '';
            try {
                const res = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({email, senha}),
                    credentials: 'include'
                });
                if(res.ok) {
                    window.location.href = 'index.html';
                } else {
                    const data = await res.json();
                    errorDiv.textContent = data.error || 'Credenciais inválidas';
                }
            } catch(e) {
                errorDiv.textContent = 'Erro ao conectar com o servidor.';
            }
        });
        return;
    }

    try {
        const res = await fetch(`${API_URL}/auth/me`, fetchOpts);
        if (!res.ok) {
            window.location.href = 'login.html';
            return;
        }
        const data = await res.json();
        // Set user info
        document.getElementById('user-name').textContent = data.user.nome;
        document.getElementById('user-email').textContent = data.user.email;
        document.getElementById('user-avatar').textContent = data.user.nome.charAt(0).toUpperCase();

        document.getElementById('btn-logout').addEventListener('click', async () => {
            await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
            window.location.href = 'login.html';
        });

        initSettings();
        loadDashboard();

    } catch(err) {
        window.location.href = 'login.html';
    }
}

// Instâncias do Chart.js
let lineChartInstance = null;
let doughnutChartInstance = null;

// --- NAVEGAÇÃO DE ABAS ---
const navBtns = document.querySelectorAll('.nav-btn[data-target]');
const tabPanes = document.querySelectorAll('.tab-pane');

navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        tabPanes.forEach(pane => pane.classList.remove('active'));
        const target = btn.getAttribute('data-target');
        document.getElementById(target).classList.add('active');

        // Refresh dos dados de acordo com a aba
        if(target === 'dash-tab') loadDashboard();
        if(target === 'prod-tab') loadProdutos();
        if(target === 'mov-tab') {
            loadMovimentacoes();
            populateSelectProdutos();
        }
    });
});

// --- DASHBOARD ---
async function loadDashboard() {
    try {
        const res = await fetch(`${API_URL}/dashboard`, fetchOpts);
        if(!res.ok) return;
        const data = await res.json();

        // Métricas
        document.getElementById('m-tipos').textContent = data.metricas.total_produtos;
        document.getElementById('m-itens').textContent = data.metricas.itens_em_estoque;
        document.getElementById('m-baixo').textContent = data.metricas.estoque_baixo;
        document.getElementById('m-valor').textContent = `R$ ${data.metricas.valor_total.toFixed(2).replace('.',',')}`;
        document.getElementById('m-hoje').textContent = data.metricas.movimentacoes_hoje;

        // Renderizar Gráficos
        renderCharts(data.grafico_7dias, data.grafico_categoria);
        
        // Renderizar Estoque Atual
        const dashTbody = document.getElementById('dash-table-body');
        dashTbody.innerHTML = '';
        data.lista_estoque.forEach(p => {
            let status = `<span class="badge stable">Normal</span>`;
            if (p.quantidade_atual === 0) status = `<span class="badge zero">Zerado</span>`;
            else if (p.quantidade_atual <= p.estoque_minimo) status = `<span class="badge low">Baixo</span>`;
            
            dashTbody.innerHTML += `
                <tr>
                    <td>${p.sku}</td>
                    <td><strong>${p.nome}</strong></td>
                    <td>${p.categoria}</td>
                    <td>${p.quantidade_atual}</td>
                    <td>${p.estoque_minimo}</td>
                    <td>${status}</td>
                </tr>
            `;
        });

        // Renderizar Atividades Recentes
        const activityList = document.getElementById('activity-list');
        activityList.innerHTML = '';
        data.ultimas_movimentacoes.forEach(m => {
            const isIn = m.tipo === 'ENTRADA';
            const iconClass = isIn ? 'in' : 'out';
            const iconPh = isIn ? 'ph-arrow-down-left' : 'ph-arrow-up-right';
            const dateStr = new Date(m.data_hora).toLocaleString('pt-BR');
            
            activityList.innerHTML += `
                <li class="activity-item">
                    <div class="act-icon ${iconClass}">
                        <i class="ph ${iconPh}"></i>
                    </div>
                    <div class="act-details">
                        <p><strong>${isIn ? '+' : '-'}${m.quantidade}</strong> ${m.produto_nome}</p>
                        <span class="act-time">${m.motivo} • ${dateStr}</span>
                    </div>
                </li>
            `;
        });

    } catch (err) {
        console.error(err);
    }
}

function renderCharts(dados7dias, dadosCategoria) {
    Chart.defaults.color = '#8b949e';
    Chart.defaults.font.family = 'Inter';

    const ctxLine = document.getElementById('lineChart').getContext('2d');
    const labelsLine = Object.keys(dados7dias.entradas).reverse();
    const dataIn = Object.values(dados7dias.entradas).reverse();
    const dataOut = Object.values(dados7dias.saidas).reverse();

    if (lineChartInstance) lineChartInstance.destroy();
    
    lineChartInstance = new Chart(ctxLine, {
        type: 'line',
        data: {
            labels: labelsLine,
            datasets: [
                {
                    label: 'Entradas',
                    data: dataIn,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Saídas',
                    data: dataOut,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.3,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { grid: { color: 'rgba(255,255,255,0.05)' } }
            }
        }
    });

    const ctxDoughnut = document.getElementById('doughnutChart').getContext('2d');
    if (doughnutChartInstance) doughnutChartInstance.destroy();
    
    doughnutChartInstance = new Chart(ctxDoughnut, {
        type: 'doughnut',
        data: {
            labels: Object.keys(dadosCategoria),
            datasets: [{
                data: Object.values(dadosCategoria),
                backgroundColor: ['#8b5cf6', '#10b981', '#f97316', '#3b82f6', '#ef4444'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { position: 'right' }
            }
        }
    });
}

// --- PRODUTOS ---
async function loadProdutos() {
    try {
        const res = await fetch(`${API_URL}/produtos`, fetchOpts);
        if(!res.ok) return;
        const produtos = await res.json();
        
        const tbody = document.getElementById('prod-table-body');
        if(!tbody) return;
        tbody.innerHTML = '';
        
        produtos.forEach(p => {
            tbody.innerHTML += `
                <tr>
                    <td>${p.sku}</td>
                    <td><strong>${p.nome}</strong></td>
                    <td>${p.categoria}</td>
                    <td>R$ ${p.preco.toFixed(2).replace('.',',')}</td>
                    <td>${p.quantidade_atual}</td>
                    <td>
                        <button onclick="deletarProduto(${p.id})" style="background:transparent;border:none;color:var(--neon-red);cursor:pointer;font-size:1.2rem;"><i class="ph ph-trash"></i></button>
                    </td>
                </tr>
            `;
        });
    } catch (err) {}
}

const formProduto = document.getElementById('form-produto');
if(formProduto) {
    formProduto.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            sku: document.getElementById('p-sku').value,
            nome: document.getElementById('p-nome').value,
            categoria: document.getElementById('p-cat').value,
            preco: parseFloat(document.getElementById('p-preco').value),
            estoque_minimo: parseInt(document.getElementById('p-min').value),
            quantidade_atual: parseInt(document.getElementById('p-qtd').value),
            descricao: document.getElementById('p-desc').value
        };

        try {
            const res = await fetch(`${API_URL}/produtos`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload),
                credentials: 'include'
            });
            
            if (res.ok) {
                e.target.reset();
                loadProdutos();
                alert("Produto cadastrado com sucesso!");
            } else {
                const erro = await res.json();
                alert("Erro: " + erro.error);
            }
        } catch(err) {
            alert("Erro ao conectar com servidor.");
        }
    });
}

window.deletarProduto = async (id) => {
    if(confirm('Tem certeza que deseja excluir?')) {
        await fetch(`${API_URL}/produtos/${id}`, { method: 'DELETE', credentials: 'include' });
        loadProdutos();
    }
}

// --- MOVIMENTAÇÕES ---
window.setMovType = (type) => {
    const mTipo = document.getElementById('m-tipo');
    if(mTipo) mTipo.value = type;
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    if(type === 'ENTRADA') {
        const el = document.querySelector('.type-btn.in');
        if(el) el.classList.add('active');
    }
    else {
        const el = document.querySelector('.type-btn.out');
        if(el) el.classList.add('active');
    }
}

async function populateSelectProdutos() {
    try {
        const res = await fetch(`${API_URL}/produtos`, fetchOpts);
        if(!res.ok) return;
        const produtos = await res.json();
        const select = document.getElementById('m-prod');
        if(!select) return;
        select.innerHTML = '<option value="">Selecione um produto...</option>';
        produtos.forEach(p => {
            select.innerHTML += `<option value="${p.id}">${p.sku} - ${p.nome} (Disp: ${p.quantidade_atual})</option>`;
        });
    } catch(err) { }
}

async function loadMovimentacoes() {
    try {
        const res = await fetch(`${API_URL}/movimentacoes`, fetchOpts);
        if(!res.ok) return;
        const movs = await res.json();
        
        const tbody = document.getElementById('mov-table-body');
        if(!tbody) return;
        tbody.innerHTML = '';
        
        movs.forEach(m => {
            const dateStr = new Date(m.data_hora).toLocaleString('pt-BR');
            const isIn = m.tipo === 'ENTRADA';
            const color = isIn ? 'var(--neon-green)' : 'var(--neon-red)';
            const sign = isIn ? '+' : '-';

            tbody.innerHTML += `
                <tr>
                    <td>${dateStr}</td>
                    <td>${m.produto_nome}</td>
                    <td style="color:${color}; font-weight:bold;">${sign}${m.quantidade}</td>
                    <td>${m.motivo}</td>
                </tr>
            `;
        });
    } catch(err) {}
}

const formMov = document.getElementById('form-mov');
if(formMov) {
    formMov.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            produto_id: parseInt(document.getElementById('m-prod').value),
            tipo: document.getElementById('m-tipo').value,
            quantidade: parseInt(document.getElementById('m-qtd').value),
            motivo: document.getElementById('m-motivo').value,
            observacoes: document.getElementById('m-obs').value
        };

        if(isNaN(payload.produto_id)) {
            alert("Selecione o produto!");
            return;
        }

        try {
            const res = await fetch(`${API_URL}/movimentacoes`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload),
                credentials: 'include'
            });
            
            if (res.ok) {
                e.target.reset();
                setMovType('ENTRADA'); // reseta
                loadMovimentacoes();
                populateSelectProdutos();
                alert("Movimentação registrada!");
            } else {
                const erro = await res.json();
                alert("Erro: " + erro.error);
            }
        } catch(err) {
            alert("Erro de conexão.");
        }
    });
}

// Inicializa checando auth (ou setando a tela de login)
checkAuth();
