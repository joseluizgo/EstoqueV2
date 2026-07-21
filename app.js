const API_URL = 'http://127.0.0.1:5000/api';

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
        const res = await fetch(`${API_URL}/dashboard`);
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
        console.error("Erro ao carregar dashboard (Backend não iniciado?)", err);
    }
}

function renderCharts(dados7dias, dadosCategoria) {
    // Config global chart.js
    Chart.defaults.color = '#8b949e';
    Chart.defaults.font.family = 'Inter';

    // Gráfico de Linha (7 dias)
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

    // Gráfico de Rosca (Categorias)
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
        const res = await fetch(`${API_URL}/produtos`);
        const produtos = await res.json();
        
        const tbody = document.getElementById('prod-table-body');
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
    } catch (err) {
        console.error(err);
    }
}

document.getElementById('form-produto').addEventListener('submit', async (e) => {
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
            body: JSON.stringify(payload)
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

window.deletarProduto = async (id) => {
    if(confirm('Tem certeza que deseja excluir?')) {
        await fetch(`${API_URL}/produtos/${id}`, { method: 'DELETE' });
        loadProdutos();
    }
}

// --- MOVIMENTAÇÕES ---
window.setMovType = (type) => {
    document.getElementById('m-tipo').value = type;
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    if(type === 'ENTRADA') document.querySelector('.type-btn.in').classList.add('active');
    else document.querySelector('.type-btn.out').classList.add('active');
}

async function populateSelectProdutos() {
    try {
        const res = await fetch(`${API_URL}/produtos`);
        const produtos = await res.json();
        const select = document.getElementById('m-prod');
        select.innerHTML = '<option value="">Selecione um produto...</option>';
        produtos.forEach(p => {
            select.innerHTML += `<option value="${p.id}">${p.sku} - ${p.nome} (Disp: ${p.quantidade_atual})</option>`;
        });
    } catch(err) { }
}

async function loadMovimentacoes() {
    try {
        const res = await fetch(`${API_URL}/movimentacoes`);
        const movs = await res.json();
        
        const tbody = document.getElementById('mov-table-body');
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

document.getElementById('form-mov').addEventListener('submit', async (e) => {
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
            body: JSON.stringify(payload)
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

// Inicialização
loadDashboard();
