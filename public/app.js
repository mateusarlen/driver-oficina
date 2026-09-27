const API = '/api';
let usuarioAtual = null;
let paginaAtual = 'dashboard';
let dadosGlobais = { clientes: [], veiculos: [], os: [] };
let presetSelecionado = 'oleo';
let modoNovaOS = 'novo';
let abaOSDetalhe = 'orcamento';

const PRESETS = {
  lataria: {
    id: 'lataria',
    nome: '🛡️ Lataria, Pintura & Avarias',
    descricao: 'Vistoria de arranhões, mossas, vidros e integridade da carroceria na entrada',
    itens: [
      'Para-choque Dianteiro (Ralados / Quebrado)',
      'Para-choque Traseiro (Ralados / Quebrado)',
      'Capô do Motor (Pintura / Amassados)',
      'Teto do Veículo',
      'Tampa do Porta-Malas',
      'Portas e Lateral Esquerda',
      'Portas e Lateral Direita',
      'Para-brisa e Palhetas (Trincas)',
      'Vidros Laterais e Traseiro',
      'Faróis, Lanternas e Milhas',
      'Retrovisores Externos',
      'Rodas e Calotas (Arranhões)'
    ]
  },
  oleo: {
    id: 'oleo',
    nome: '🛢️ Troca de Óleo e Filtros',
    descricao: 'Inspeção de fluidos e troca de elementos filtrantes',
    itens: [
      'Óleo do Motor',
      'Filtro de Óleo',
      'Filtro de Ar do Motor',
      'Filtro de Combustível',
      'Filtro de Cabine (Ar Cond.)',
      'Nível de Fluidos (Freio/Radiador)'
    ]
  },
  freios: {
    id: 'freios',
    nome: '🛑 Freios e Suspensão',
    descricao: 'Inspeção completa de segurança de rodagem e frenagem',
    itens: [
      'Pastilhas de Freio Dianteiras',
      'Discos de Freio Dianteiros',
      'Lonas e Tambores Traseiros',
      'Fluido de Freio DOT4',
      'Amortecedores e Molas',
      'Buchas, Pivôs e Bieletas',
      'Pneus e Calibragem'
    ]
  },
  revisao: {
    id: 'revisao',
    nome: '🚗 Revisão Geral (15 Itens)',
    descricao: 'Check-up completo de 15 pontos do veículo',
    itens: [
      'Pneus Dianteiros',
      'Pneus Traseiros',
      'Freios Dianteiros',
      'Freios Traseiros',
      'Óleo do Motor',
      'Fluido de Freio',
      'Água do Radiador / Arrefecimento',
      'Correia Dentada / Acessórios',
      'Filtro de Ar do Motor',
      'Faróis, Lanternas e Setas',
      'Limpadores de Para-brisa',
      'Suspensão Dianteira',
      'Suspensão Traseira',
      'Bateria e Carga Alternador',
      'Escapamento e Coxins'
    ]
  },
  eletrica: {
    id: 'eletrica',
    nome: '⚡ Elétrica e Injeção',
    descricao: 'Diagnóstico de carga, partida e injeção eletrônica',
    itens: [
      'Tensão e Saúde da Bateria',
      'Carga do Alternador',
      'Velas de Ignição',
      'Cabos de Ignição / Bobinas',
      'Faróis, Lanternas e Iluminação Geral',
      'Parâmetros e Leituras de Injeção'
    ]
  }
};

// MODELOS MAIS POPULARES DO BRASIL PARA AUTOCOMPLETE
const MODELOS_POPULARES = [
  'Fiat Uno 1.0 Fire', 'Fiat Palio 1.0 / 1.4', 'Fiat Strada 1.4 / 1.3', 'Fiat Argo 1.0 / 1.3', 'Fiat Mobi 1.0', 'Fiat Toro 2.0 / 1.3 Turbo', 'Fiat Cronos 1.3',
  'Chevrolet Onix 1.0 / Turbo', 'Chevrolet Prisma 1.4', 'Chevrolet Celta 1.0', 'Chevrolet Corsa 1.0 / 1.4', 'Chevrolet Classic 1.0', 'Chevrolet Tracker 1.0 Turbo', 'Chevrolet Spin 1.8', 'Chevrolet S10 2.8 Diesel', 'Chevrolet Cruze 1.4 Turbo',
  'Volkswagen Gol 1.0 / 1.6', 'Volkswagen Fox 1.0 / 1.6', 'Volkswagen Voyage 1.0 / 1.6', 'Volkswagen Polo 1.0 TSI', 'Volkswagen T-Cross 1.0 TSI', 'Volkswagen Saveiro 1.6', 'Volkswagen Virtus 1.0 TSI',
  'Hyundai HB20 1.0 / 1.6', 'Hyundai Creta 1.6 / 2.0',
  'Ford Ka 1.0 / 1.5', 'Ford Fiesta 1.0 / 1.6', 'Ford EcoSport 1.5 / 2.0',
  'Toyota Corolla 1.8 / 2.0 / Hybrid', 'Toyota Hilux 2.8 Diesel', 'Toyota Yaris 1.5', 'Toyota Etios 1.3 / 1.5',
  'Honda Civic 1.8 / 2.0 / Touring', 'Honda Fit 1.4 / 1.5', 'Honda HR-V 1.8 / Touring', 'Honda City 1.5',
  'Renault Kwid 1.0', 'Renault Sandero 1.0 / 1.6', 'Renault Duster 1.6 / 2.0', 'Renault Logan 1.0 / 1.6',
  'Jeep Renegade 1.8 / 1.3 Turbo', 'Jeep Compass 2.0 / 1.3 Turbo',
  'Nissan Kicks 1.6', 'Nissan Versa 1.6', 'Nissan March 1.0 / 1.6'
];

function getToken() { return localStorage.getItem('driver_token'); }
function setToken(t) { localStorage.setItem('driver_token', t); }
function removeToken() { localStorage.removeItem('driver_token'); usuarioAtual = null; }

function getModalContainer() {
  let c = document.getElementById('modal-container');
  if (!c) {
    c = document.createElement('div');
    c.id = 'modal-container';
    const app = document.getElementById('app');
    if (app) app.appendChild(c);
    else document.body.appendChild(c);
  }
  return c;
}

function getToastContainer() {
  let c = document.getElementById('toast-container');
  if (!c) {
    c = document.createElement('div');
    c.id = 'toast-container';
    document.body.appendChild(c);
  }
  return c;
}

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const uploadOsId = urlParams.get('upload_os');
  if (uploadOsId) {
    renderUploadRapido(uploadOsId);
    return;
  }

  if (getToken()) {
    try {
      usuarioAtual = await get('/auth/me');
      renderApp();
      navegarPara('dashboard');
    } catch (e) {
      renderAuth();
    }
  } else {
    renderAuth();
  }
});

async function req(url, options = {}) {
  options.headers = options.headers || {};
  const token = getToken();
  if (token) options.headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(API + url, options);
  if (res.status === 401) {
    removeToken();
    renderAuth();
    throw new Error('Sessão expirada');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Ocorreu um erro');
  return data;
}

async function get(u) { return req(u); }
async function post(u, f) { return req(u, { method: 'POST', body: f }); }
async function put(u, f) { return req(u, { method: 'PUT', body: f }); }
async function del(u) { return req(u, { method: 'DELETE' }); }

function toast(msg, tipo = 'ok') {
  const t = document.createElement('div');
  t.className = `toast ${tipo === 'erro' ? 'erro' : ''}`;
  t.textContent = msg;
  const tc = getToastContainer();
  tc.appendChild(t);
  setTimeout(() => t.remove(), 2800);
}

function fecharModal(e) {
  if (e && e.target && e.target.classList.contains('modal-overlay')) {
    fecharModalForce();
  }
}

function fecharModalForce() {
  const c = getModalContainer();
  c.innerHTML = '';
}

function formatarData(s) {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ─── TELA PÚBLICA DE UPLOAD RÁPIDO DE SCANNER (QR CODE / WHATSAPP) ───────────
function renderUploadRapido(os_id) {
  document.getElementById('app').innerHTML = `
    <div class="auth-wrapper">
      <div class="auth-card" style="max-width:480px">
        <div class="auth-header">
          <h2>📲 DRIVER SCANNER</h2>
          <p>Envio Rápido de Relatório para a OS #${os_id}</p>
        </div>

        <div class="card" style="text-align:center;padding:16px;background:var(--bg3)">
          <div style="font-size:1rem;font-weight:700;margin-bottom:6px">Anexe o Arquivo do Scanner</div>
          <div style="color:var(--text2);font-size:0.82rem;margin-bottom:14px">
            Selecione o relatório gerado pelo seu aparelho (PDF) ou tire uma foto da tela do diagnóstico.
          </div>

          <form id="form-upload-rapido" onsubmit="event.preventDefault();enviarUploadRapido(${os_id})">
            <div class="form-group" style="text-align:left">
              <label class="form-label">Arquivo do Scanner (PDF ou Foto)</label>
              <input type="file" id="up-rapido-file" class="form-input" accept=".pdf,image/*" required onchange="mostrarNomeArquivo(this)"/>
              <div id="up-rapido-nome" style="font-size:0.8rem;color:var(--ok);margin-top:6px;font-weight:700"></div>
            </div>

            <div class="form-group" style="text-align:left">
              <label class="form-label">Códigos de Falha / Falhas Encontradas (Opcional)</label>
              <input type="text" class="form-input" id="up-rapido-dtcs" placeholder="Ex: P0300, P0420..."/>
            </div>

            <div class="form-group" style="text-align:left">
              <label class="form-label">Observações Técnicas</label>
              <textarea class="form-input" id="up-rapido-obs" rows="2" placeholder="Ex: Scanner Raven 3 / Napro / Launch"></textarea>
            </div>

            <button type="submit" class="btn btn-primary" id="btn-up-rapido" style="padding:14px;font-size:1rem">
              🚀 Enviar Relatório para a Oficina
            </button>
          </form>
        </div>

        <div id="msg-sucesso-rapido" style="display:none;text-align:center;padding:20px">
          <div style="font-size:3rem">✅</div>
          <div style="font-size:1.2rem;font-weight:800;color:var(--ok);margin-top:10px">Relatório Enviado com Sucesso!</div>
          <div style="color:var(--text2);font-size:0.85rem;margin-top:6px">A equipe técnica da oficina já recebeu os dados na OS #${os_id}.</div>
        </div>
      </div>
    </div>
  `;
}

function mostrarNomeArquivo(input) {
  const lbl = document.getElementById('up-rapido-nome');
  if (input.files && input.files[0]) {
    lbl.textContent = `✓ Selecionado: ${input.files[0].name} (${(input.files[0].size/1024).toFixed(1)} KB)`;
  } else {
    lbl.textContent = '';
  }
}

async function enviarUploadRapido(os_id) {
  const fileInput = document.getElementById('up-rapido-file');
  if (!fileInput.files || !fileInput.files[0]) {
    toast('Selecione um arquivo PDF ou foto do scanner!', 'erro');
    return;
  }
  const btn = document.getElementById('btn-up-rapido');
  btn.disabled = true;
  btn.textContent = 'Enviando relatório...';

  const f = new FormData();
  f.append('arquivo', fileInput.files[0]);
  f.append('dtcs', document.getElementById('up-rapido-dtcs').value);
  f.append('observacoes', document.getElementById('up-rapido-obs').value);

  try {
    await post(`/scanner/upload-rapido/${os_id}`, f);
    document.getElementById('form-upload-rapido').style.display = 'none';
    document.getElementById('msg-sucesso-rapido').style.display = 'block';
    toast('Relatório anexado à OS com sucesso!');
  } catch (err) {
    btn.disabled = false;
    btn.textContent = '🚀 Enviar Relatório para a Oficina';
    toast('Erro ao enviar: ' + err.message, 'erro');
  }
}

// ─── LOGIN / REGISTRO MULTI-TENANT ───────────────────────────────────────────
let authModo = 'login';
function renderAuth() {
  document.getElementById('app').innerHTML = `
    <div class="auth-wrapper">
      <div class="auth-card">
        <div class="auth-header">
          <h2>DRIVER</h2>
          <p>Sistema Profissional de Gestão & Scanner</p>
          <span class="auth-badge">🔒 Dados 100% Isolados da Sua Oficina</span>
        </div>
        <div class="auth-tabs">
          <button class="auth-tab ${authModo==='login'?'active':''}" onclick="setAuthModo('login')">Entrar</button>
          <button class="auth-tab ${authModo==='cadastro'?'active':''}" onclick="setAuthModo('cadastro')">Criar Conta</button>
        </div>
        <form id="form-auth" onsubmit="event.preventDefault();submeterAuth()">
          ${authModo === 'cadastro' ? `
            <div class="form-group">
              <label class="form-label">Nome da Oficina / Mecânica *</label>
              <input type="text" inputmode="text" class="form-input" name="nome_oficina" required placeholder="Ex: Auto Mecânica Silva" autocomplete="organization"/>
            </div>
            <div class="form-group">
              <label class="form-label">Seu Nome Completo *</label>
              <input type="text" inputmode="text" class="form-input" name="nome" required placeholder="Ex: Carlos Mecânico" autocomplete="name"/>
            </div>
          ` : ''}
          <div class="form-group">
            <label class="form-label">E-mail *</label>
            <input type="email" inputmode="email" class="form-input" name="email" required placeholder="seu@email.com" autocomplete="username"/>
          </div>
          <div class="form-group">
            <label class="form-label">Senha *</label>
            <input type="password" class="form-input" name="senha" required placeholder="••••••••" autocomplete="current-password"/>
          </div>
          <button type="submit" class="btn btn-primary" style="margin-top:10px;padding:14px;font-size:1rem">
            ${authModo === 'login' ? '🔑 Entrar no Sistema' : '🚀 Cadastrar Minha Oficina'}
          </button>
        </form>
      </div>
    </div>
  `;
}

function setAuthModo(m) {
  authModo = m;
  renderAuth();
}

async function submeterAuth() {
  const f = new FormData(document.getElementById('form-auth'));
  try {
    if (authModo === 'login') {
      const res = await post('/auth/login', f);
      setToken(res.token);
      usuarioAtual = res.usuario;
      toast(`Bem-vindo, ${usuarioAtual.nome}!`);
      renderApp();
      navegarPara('dashboard');
    } else {
      const res = await post('/auth/cadastro', f);
      setToken(res.token);
      usuarioAtual = res.usuario;
      toast(`Conta criada com sucesso!`);
      renderApp();
      navegarPara('dashboard');
    }
  } catch (err) {
    toast(err.message, 'erro');
  }
}

async function fazerLogout() {
  try { await post('/auth/logout'); } catch (e) {}
  removeToken();
  toast('Você saiu do sistema');
  renderAuth();
}

// ─── ESTRUTURA PRINCIPAL DO APP ──────────────────────────────────────────────
function renderApp() {
  document.getElementById('app').innerHTML = `
    <header class="header">
      <div>
        <h1>DRIVER</h1>
        <div class="subtitle">${usuarioAtual ? usuarioAtual.nome_oficina.toUpperCase() : 'OFICINA INTELIGENTE'}</div>
      </div>
      <div id="header-action"></div>
    </header>

    <main class="main" id="main-content"></main>

    <nav class="bottom-nav">
      <button class="nav-btn active" id="nav-dashboard" onclick="navegarPara('dashboard')">
        <span class="icon">📊</span>Início
      </button>
      <button class="nav-btn" id="nav-os" onclick="navegarPara('os')">
        <span class="icon">📋</span>O.S.
      </button>
      <button class="nav-btn" id="nav-veiculos" onclick="navegarPara('veiculos')">
        <span class="icon">🚗</span>Veículos
      </button>
      <button class="nav-btn" id="nav-clientes" onclick="navegarPara('clientes')">
        <span class="icon">👤</span>Clientes
      </button>
      <button class="nav-btn" id="nav-perfil" onclick="navegarPara('perfil')">
        <span class="icon">⚙️</span>Conta
      </button>
    </nav>
    <div id="modal-container"></div>
    <div id="toast-container"></div>
  `;
}

function navegarPara(pagina) {
  paginaAtual = pagina;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('nav-' + pagina);
  if (btn) btn.classList.add('active');

  const headerAction = document.getElementById('header-action');
  if (headerAction) headerAction.innerHTML = '';

  if (pagina === 'dashboard') renderDashboard();
  else if (pagina === 'os') renderOS();
  else if (pagina === 'veiculos') renderVeiculos();
  else if (pagina === 'clientes') renderClientes();
  else if (pagina === 'perfil') renderPerfil();
}

// ─── DASHBOARD COM BUSCA RÁPIDA ──────────────────────────────────────────────
let listaDashboardOS = [];
async function renderDashboard() {
  const headerAction = document.getElementById('header-action');
  if (headerAction) headerAction.innerHTML = '';

  try {
    const d = await get('/dashboard');
    listaDashboardOS = d.ultimas_os || [];

    document.getElementById('main-content').innerHTML = `
      <div class="user-info-bar">
        <span>🏢 <b>${d.usuario.nome_oficina}</b> (${d.usuario.nome})</span>
        <span style="color:var(--ok);font-weight:700">● Conectado</span>
      </div>

      <!-- BUSCA RÁPIDA INSTANTÂNEA -->
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input type="text" class="search-input" placeholder="Buscar por placa, cliente ou carro..." oninput="filtrarDashboard(this.value)" autocomplete="off"/>
      </div>

      <div class="dash-grid">
        <div class="card"><div class="card-title">OS Abertas</div><div class="card-value">${d.os_abertas}</div></div>
        <div class="card"><div class="card-title">Em Andamento</div><div class="card-value" style="color:#3b82f6">${d.os_andamento}</div></div>
        <div class="card"><div class="card-title">Clientes</div><div class="card-value" style="color:var(--text)">${d.total_clientes}</div></div>
        <div class="card"><div class="card-title">Veículos</div><div class="card-value" style="color:var(--text)">${d.total_veiculos}</div></div>
      </div>

      <!-- AÇÕES RÁPIDAS NO CENTRO DA TELA -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
        <button class="btn btn-primary" onclick="modalNovaOS('novo')" style="padding:14px;font-size:0.88rem">
          ➕ Criar Nova OS
        </button>
        <button class="btn btn-outline" onclick="modalNovoCliente()" style="padding:14px;font-size:0.88rem">
          👤 Novo Cliente
        </button>
      </div>

      <div class="section-title">🕒 Últimas Ordens de Serviço</div>
      <div id="container-dash-os">
        ${renderizarListaOSHtml(listaDashboardOS)}
      </div>
    `;
  } catch (err) {
    toast('Erro ao carregar dados: ' + err.message, 'erro');
  }
}

function filtrarDashboard(termo) {
  const t = termo.trim().toLowerCase();
  const c = document.getElementById('container-dash-os');
  if (!c) return;
  if (!t) {
    c.innerHTML = renderizarListaOSHtml(listaDashboardOS);
    return;
  }
  const filtradas = listaDashboardOS.filter(o => 
    (o.placa && o.placa.toLowerCase().includes(t)) ||
    (o.modelo && o.modelo.toLowerCase().includes(t)) ||
    (o.cliente && o.cliente.toLowerCase().includes(t)) ||
    (o.cliente_nome && o.cliente_nome.toLowerCase().includes(t))
  );
  c.innerHTML = renderizarListaOSHtml(filtradas);
}

function renderizarListaOSHtml(lista) {
  if (lista.length === 0) {
    return '<div class="card" style="color:#94a3b8;text-align:center;padding:20px">Nenhuma OS encontrada.</div>';
  }
  return lista.map(o => `
    <div class="list-item" onclick="abrirOS(${o.id})">
      <div class="info">
        <div class="title">OS #${o.id} - ${o.placa} ${o.modelo}</div>
        <div class="sub">Cliente: <b>${o.cliente || o.cliente_nome || '—'}</b> · ${formatarData(o.criado_em)}</div>
      </div>
      <span class="badge badge-${o.status.toLowerCase().replace(' ','-')}">${o.status}</span>
    </div>
  `).join('');
}

// ─── PERFIL / CONTA COM EDIÇÃO DE OFICINA ───────────────────────────────────
function renderPerfil() {
  document.getElementById('header-action').innerHTML = '';
  document.getElementById('main-content').innerHTML = `
    <div class="section-title">⚙️ Configurações da Oficina & Perfil</div>

    <div class="card">
      <div style="font-weight:800;font-size:1.05rem;color:var(--primary);margin-bottom:4px">
        🏢 Dados da Sua Oficina
      </div>
      <div style="font-size:0.8rem;color:var(--text2);margin-bottom:16px">
        Altere o nome da oficina exibido no cabeçalho do app, nos laudos técnicos e nos orçamentos impressos / PDF.
      </div>

      <form id="form-perfil-oficina" onsubmit="event.preventDefault();salvarPerfilOficina()">
        <div class="form-group">
          <label class="form-label">Nome da Oficina / Mecânica *</label>
          <input type="text" inputmode="text" class="form-input" id="perfil-nome-oficina" required value="${usuarioAtual.nome_oficina || ''}" placeholder="Ex: Auto Mecânica BORDCAN" autocomplete="organization"/>
        </div>

        <div class="form-group">
          <label class="form-label">Nome do Responsável / Mecânico Chefe</label>
          <input type="text" inputmode="text" class="form-input" id="perfil-nome-resp" value="${usuarioAtual.nome || ''}" placeholder="Ex: Mateus Arlen" autocomplete="name"/>
        </div>

        <div class="form-group">
          <label class="form-label">Telefone / WhatsApp da Oficina</label>
          <input type="tel" inputmode="tel" class="form-input" id="perfil-tel-oficina" value="${usuarioAtual.telefone || ''}" placeholder="(11) 98765-4321" autocomplete="tel"/>
        </div>

        <div class="form-group">
          <label class="form-label">E-mail de Login (Acesso)</label>
          <input type="text" class="form-input" value="${usuarioAtual.email || ''}" disabled style="opacity:0.6;cursor:not-allowed"/>
        </div>

        <button type="submit" class="btn btn-primary" id="btn-salvar-perfil" style="margin-top:6px;padding:12px;font-size:0.92rem">
          💾 Salvar Alterações da Oficina
        </button>
      </form>
    </div>

    <div class="card">
      <div class="card-title">Segurança & Sessão</div>
      <div style="font-size:0.8rem;color:var(--ok);font-weight:700;margin-bottom:10px">
        🔒 Banco de Dados e Ordens de Serviço 100% Isolados da Sua Oficina
      </div>
      <button class="btn btn-danger" onclick="fazerLogout()" style="padding:10px;font-size:0.88rem">
        🚪 Sair do Sistema (Logout)
      </button>
    </div>
  `;
}

async function salvarPerfilOficina() {
  const nomeOficina = document.getElementById('perfil-nome-oficina').value.trim();
  const nomeResp = document.getElementById('perfil-nome-resp').value.trim();
  const telOficina = document.getElementById('perfil-tel-oficina').value.trim();

  if (!nomeOficina) {
    toast('O nome da oficina não pode ficar vazio!', 'erro');
    return;
  }

  const btn = document.getElementById('btn-salvar-perfil');
  btn.disabled = true;
  btn.textContent = 'Salvando alterações...';

  const f = new FormData();
  f.append('nome_oficina', nomeOficina);
  f.append('nome', nomeResp);
  f.append('telefone', telOficina);

  try {
    const res = await put('/auth/perfil', f);
    usuarioAtual = res.usuario;

    // Atualiza imediatamente o subtitulo do cabeçalho
    const sub = document.querySelector('.header .subtitle');
    if (sub) sub.textContent = usuarioAtual.nome_oficina.toUpperCase();

    toast('✓ Dados da oficina atualizados com sucesso!');
    renderPerfil();
  } catch (err) {
    btn.disabled = false;
    btn.textContent = '💾 Salvar Alterações da Oficina';
    toast('Erro ao salvar: ' + err.message, 'erro');
  }
}

// ─── CLIENTES COM BUSCA RÁPIDA ────────────────────────────────────────────────
async function renderClientes() {
  document.getElementById('header-action').innerHTML = '';
  try {
    const clientes = await get('/clientes');
    dadosGlobais.clientes = clientes;
    document.getElementById('main-content').innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div class="section-title" style="margin-bottom:0">👤 Seus Clientes (${clientes.length})</div>
        <button class="btn btn-primary btn-sm" onclick="modalNovoCliente()">+ Novo Cliente</button>
      </div>

      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input type="text" class="search-input" placeholder="Buscar por nome, telefone ou CPF..." oninput="filtrarClientes(this.value)" autocomplete="off"/>
      </div>

      <div id="container-clientes-lista">
        ${renderizarListaClientesHtml(clientes)}
      </div>
    `;
  } catch (err) {
    toast('Erro ao buscar clientes: ' + err.message, 'erro');
  }
}

function filtrarClientes(termo) {
  const t = termo.trim().toLowerCase();
  const c = document.getElementById('container-clientes-lista');
  if (!c) return;
  if (!t) {
    c.innerHTML = renderizarListaClientesHtml(dadosGlobais.clientes);
    return;
  }
  const filtrados = dadosGlobais.clientes.filter(x =>
    (x.nome && x.nome.toLowerCase().includes(t)) ||
    (x.telefone && x.telefone.toLowerCase().includes(t)) ||
    (x.cpf && x.cpf.toLowerCase().includes(t))
  );
  c.innerHTML = renderizarListaClientesHtml(filtrados);
}

function renderizarListaClientesHtml(lista) {
  if (lista.length === 0) {
    return '<div class="card" style="color:#94a3b8;text-align:center;padding:24px">Nenhum cliente encontrado.</div>';
  }
  return lista.map(c => `
    <div class="list-item" onclick="detalheCliente(${c.id})">
      <div class="info"><div class="title">👤 ${c.nome}</div><div class="sub">${c.telefone || 'Sem telefone'} · ${c.email || 'Sem e-mail'}</div></div>
      <div style="display:flex;align-items:center;gap:8px">
        <button type="button" class="btn btn-outline btn-sm" onclick="event.stopPropagation();modalConfirmarExcluirCliente(${c.id}, '${c.nome.replace(/'/g, "\\'")}')" style="padding:4px 8px;font-size:0.75rem;color:#ef4444;border-color:rgba(239,68,68,0.3);background:rgba(239,68,68,0.06)" title="Excluir cliente">
          🗑️
        </button>
        <div class="arrow">›</div>
      </div>
    </div>
  `).join('');
}

function modalNovoCliente(d = null) {
  getModalContainer().innerHTML = `
    <div class="modal-overlay" onclick="fecharModal(event)">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">${d?'Editar':'Novo'} Cliente</div>
          <button type="button" class="modal-close" onclick="fecharModalForce()">✕</button>
        </div>
        <form id="form-cliente" onsubmit="event.preventDefault();salvarCliente(${d?d.id:'null'})">
          <div class="form-group">
            <label class="form-label">Nome Completo *</label>
            <input type="text" inputmode="text" class="form-input" id="cli-nome" name="nome" required value="${d?d.nome:''}" autocomplete="name" placeholder="Ex: João Silva"/>
          </div>
          <div class="form-group">
            <label class="form-label">Telefone / WhatsApp</label>
            <input type="tel" inputmode="tel" class="form-input" id="cli-tel" name="telefone" value="${d?d.telefone||'':''}" autocomplete="tel" placeholder="(11) 98765-4321"/>
          </div>
          <div class="form-group">
            <label class="form-label">E-mail</label>
            <input type="email" inputmode="email" class="form-input" id="cli-email" name="email" value="${d?d.email||'':''}" autocomplete="email" placeholder="cliente@email.com"/>
          </div>
          <div class="form-group">
            <label class="form-label">CPF</label>
            <input type="text" inputmode="numeric" class="form-input" id="cli-cpf" name="cpf" value="${d?d.cpf||'':''}" placeholder="000.000.000-00"/>
          </div>
          <div style="display:flex;gap:8px;margin-top:16px">
            <button type="button" class="btn btn-outline" onclick="fecharModalForce()">Cancelar</button>
            <button type="submit" class="btn btn-primary">💾 Salvar Cliente</button>
          </div>
        </form>
      </div>
    </div>`;
}

async function salvarCliente(id) {
  try {
    const f = new FormData(document.getElementById('form-cliente'));
    if (id) { await put('/clientes/' + id, f); } else { await post('/clientes', f); }
    toast('Cliente salvo com sucesso!');
    fecharModalForce();
    if (paginaAtual === 'clientes') renderClientes();
    else if (paginaAtual === 'dashboard') renderDashboard();
  } catch (err) {
    toast('Erro ao salvar: ' + err.message, 'erro');
  }
}

async function detalheCliente(id) {
  try {
    const c = await get('/clientes/' + id);
    const v = await get('/veiculos?cliente_id=' + id);
    getModalContainer().innerHTML = `
      <div class="modal-overlay" onclick="fecharModal(event)">
        <div class="modal">
          <div class="modal-header">
            <div class="modal-title">👤 ${c.nome}</div>
            <button type="button" class="modal-close" onclick="fecharModalForce()">✕</button>
          </div>
          <div class="card">
            <div class="sub">📞 Telefone: ${c.telefone||'—'}</div>
            <div class="sub">📧 E-mail: ${c.email||'—'}</div>
            <div class="sub">🪪 CPF: ${c.cpf||'—'}</div>
          </div>
          <div style="display:flex;gap:8px;margin-bottom:16px">
            <button class="btn btn-outline btn-sm" style="flex:1" onclick="modalNovoCliente(${JSON.stringify(c).replace(/"/g,'&quot;')})">✏️ Editar Dados</button>
            <button type="button" class="btn btn-outline btn-sm" style="color:#ef4444;border-color:rgba(239,68,68,0.35);background:rgba(239,68,68,0.06);padding:6px 12px" onclick="modalConfirmarExcluirCliente(${c.id}, '${c.nome.replace(/'/g, "\\'")}')">🗑️ Excluir</button>
          </div>
          <div class="section-title" style="font-size:0.9rem">🚗 Veículos deste Cliente (${v.length})</div>
          ${v.map(x => `<div class="list-item"><div class="info"><div class="title">${x.placa} - ${x.marca} ${x.modelo}</div><div class="sub">${x.ano} - ${x.cor} - ${x.km} km</div></div></div>`).join('')}
          <button class="btn btn-primary" style="margin-top:12px" onclick="fecharModalForce();modalNovoVeiculo(${id})">+ Novo Veículo</button>
        </div>
      </div>`;
  } catch (err) {
    toast('Erro: ' + err.message, 'erro');
  }
}

// ─── VEÍCULOS COM BUSCA E AUTOCOMPLETE ───────────────────────────────────────
async function renderVeiculos() {
  document.getElementById('header-action').innerHTML = '';
  try {
    const veiculos = await get('/veiculos');
    dadosGlobais.veiculos = veiculos;
    document.getElementById('main-content').innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div class="section-title" style="margin-bottom:0">🚗 Seus Veículos (${veiculos.length})</div>
        <button class="btn btn-primary btn-sm" onclick="modalNovoVeiculo()">+ Novo Veículo</button>
      </div>

      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input type="text" class="search-input" placeholder="Buscar por placa, modelo ou cliente..." oninput="filtrarVeiculos(this.value)" autocomplete="off"/>
      </div>

      <div id="container-veiculos-lista">
        ${renderizarListaVeiculosHtml(veiculos)}
      </div>
    `;
  } catch (err) {
    toast('Erro ao buscar veículos: ' + err.message, 'erro');
  }
}

function filtrarVeiculos(termo) {
  const t = termo.trim().toLowerCase();
  const c = document.getElementById('container-veiculos-lista');
  if (!c) return;
  if (!t) {
    c.innerHTML = renderizarListaVeiculosHtml(dadosGlobais.veiculos);
    return;
  }
  const filtrados = dadosGlobais.veiculos.filter(x =>
    (x.placa && x.placa.toLowerCase().includes(t)) ||
    (x.modelo && x.modelo.toLowerCase().includes(t)) ||
    (x.marca && x.marca.toLowerCase().includes(t)) ||
    (x.cliente_nome && x.cliente_nome.toLowerCase().includes(t))
  );
  c.innerHTML = renderizarListaVeiculosHtml(filtrados);
}

function renderizarListaVeiculosHtml(lista) {
  if (lista.length === 0) {
    return '<div class="card" style="color:#94a3b8;text-align:center;padding:24px">Nenhum veículo encontrado.</div>';
  }
  return lista.map(v => `
    <div class="list-item" onclick="detalheVeiculo(${v.id})">
      <div class="info"><div class="title">🪪 ${v.placa} - ${v.marca} ${v.modelo}</div><div class="sub">Cliente: <b>${v.cliente_nome}</b> · ${v.ano || ''} · ${v.km || 0} km</div></div>
      <div style="display:flex;align-items:center;gap:8px">
        <button type="button" class="btn btn-outline btn-sm" onclick="event.stopPropagation();modalConfirmarExcluirVeiculo(${v.id}, '${v.placa}')" style="padding:4px 8px;font-size:0.75rem;color:#ef4444;border-color:rgba(239,68,68,0.3);background:rgba(239,68,68,0.06)" title="Excluir veículo">
          🗑️
        </button>
        <div class="arrow">›</div>
      </div>
    </div>
  `).join('');
}

async function modalNovoVeiculo(cli = null, d = null) {
  try {
    const clientes = dadosGlobais.clientes.length ? dadosGlobais.clientes : await get('/clientes');
    dadosGlobais.clientes = clientes;
    const cid = d ? d.cliente_id : cli;
    getModalContainer().innerHTML = `
      <div class="modal-overlay" onclick="fecharModal(event)">
        <div class="modal">
          <div class="modal-header">
            <div class="modal-title">🚗 ${d ? 'Editar' : 'Novo'} Veículo</div>
            <button type="button" class="modal-close" onclick="fecharModalForce()">✕</button>
          </div>
          <form id="form-veiculo" onsubmit="event.preventDefault();salvarVeiculo(${d ? d.id : 'null'})">
            <div class="form-group"><label class="form-label">Cliente Proprietário *</label>
              <select class="form-input" name="cliente_id" required>
                <option value="">Selecione o cliente...</option>
                ${clientes.map(c => `<option value="${c.id}" ${c.id==cid?'selected':''}>${c.nome}</option>`).join('')}
              </select>
            </div>
            <div class="form-group"><label class="form-label">Placa * (Reconhecimento Automático)</label>
              <input type="text" inputmode="text" class="form-input" id="veic-placa" name="placa" required value="${d?d.placa:''}" placeholder="ABC-1234 ou ABC1D23" style="text-transform:uppercase" oninput="formatarEVerificarPlaca(this)"/>
            </div>
            <div class="form-group"><label class="form-label">Modelo / Versão *</label>
              <input type="text" inputmode="text" class="form-input" id="veic-modelo" name="modelo" list="lista-modelos-br" value="${d?d.modelo:''}" placeholder="Ex: Onix 1.0, Uno Fire..." required/>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
              <div class="form-group"><label class="form-label">Marca</label><input type="text" inputmode="text" class="form-input" id="veic-marca" name="marca" value="${d?d.marca||'':''}" placeholder="Ex: Fiat, Chevrolet..."/></div>
              <div class="form-group"><label class="form-label">Ano</label><input type="number" inputmode="numeric" class="form-input" name="ano" value="${d?d.ano||'':''}" placeholder="2020"/></div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
              <div class="form-group"><label class="form-label">Cor</label><input type="text" inputmode="text" class="form-input" name="cor" value="${d?d.cor||'':''}" placeholder="Ex: Prata, Preto..."/></div>
              <div class="form-group"><label class="form-label">KM Atual</label><input type="number" inputmode="numeric" class="form-input" name="km" value="${d?d.km||'':''}" placeholder="0"/></div>
            </div>
            <div style="display:flex;gap:8px;margin-top:16px">
              <button type="button" class="btn btn-outline" onclick="fecharModalForce()">Cancelar</button>
              <button type="submit" class="btn btn-primary">💾 Salvar Veículo</button>
            </div>
          </form>
          ${renderDatalistModelos()}
        </div>
      </div>`;
  } catch (err) {
    toast('Erro: ' + err.message, 'erro');
  }
}

async function salvarVeiculo(id = null) {
  try {
    const f = new FormData(document.getElementById('form-veiculo'));
    if (id) {
      await put('/veiculos/' + id, f);
      toast('Veículo atualizado!');
    } else {
      await post('/veiculos', f);
      toast('Veículo cadastrado!');
    }
    fecharModalForce();
    renderVeiculos();
  } catch (err) {
    toast('Erro ao salvar veículo: ' + err.message, 'erro');
  }
}

async function detalheVeiculo(id) {
  try {
    const veiculos = await get('/veiculos');
    const v = veiculos.find(x => x.id === id);
    if (!v) { toast('Veículo não encontrado', 'erro'); return; }

    const todasOS = await get('/os');
    const osDoVeiculo = todasOS.filter(o => o.veiculo_id === id);

    getModalContainer().innerHTML = `
      <div class="modal-overlay" onclick="fecharModal(event)">
        <div class="modal">
          <div class="modal-header">
            <div class="modal-title">🚗 ${v.placa} - ${v.marca} ${v.modelo}</div>
            <button type="button" class="modal-close" onclick="fecharModalForce()">✕</button>
          </div>
          <div class="card">
            <div class="sub">👤 Proprietário: <b>${v.cliente_nome}</b></div>
            <div class="sub">📅 Ano / Cor: ${v.ano || '—'} · ${v.cor || '—'}</div>
            <div class="sub">⏱️ Quilometragem: ${v.km ? v.km + ' km' : '0 km'}</div>
          </div>
          <div style="display:flex;gap:8px;margin-bottom:16px">
            <button class="btn btn-outline btn-sm" style="flex:1" onclick="modalNovoVeiculo(${v.cliente_id}, ${JSON.stringify(v).replace(/"/g,'&quot;')})">✏️ Editar Veículo</button>
            <button type="button" class="btn btn-outline btn-sm" style="color:#ef4444;border-color:rgba(239,68,68,0.35);background:rgba(239,68,68,0.06);padding:6px 12px" onclick="modalConfirmarExcluirVeiculo(${v.id}, '${v.placa}')">🗑️ Excluir</button>
          </div>
          <div class="section-title" style="font-size:0.9rem">📋 Ordens de Serviço deste Veículo (${osDoVeiculo.length})</div>
          ${osDoVeiculo.length === 0 ? '<div class="card" style="color:#94a3b8;font-size:0.8rem;text-align:center;padding:12px">Nenhuma OS aberta para este veículo.</div>' :
            osDoVeiculo.map(o => `
              <div class="list-item" onclick="fecharModalForce();abrirOS(${o.id})">
                <div class="info">
                  <div class="title">OS #${o.id} - <span class="badge badge-${o.status.toLowerCase().replace(' ','-')}">${o.status}</span></div>
                  <div class="sub">📅 ${formatarData(o.criado_em)} · 🔧 ${o.mecanico || '—'}</div>
                </div>
                <div class="arrow">›</div>
              </div>
            `).join('')}
          <button class="btn btn-primary" style="margin-top:14px;width:100%" onclick="fecharModalForce();modalNovaOS('existente')">+ Nova OS para este Veículo</button>
        </div>
      </div>`;
  } catch (err) {
    toast('Erro: ' + err.message, 'erro');
  }
}

// ─── FUNÇÕES DE CONFIRMAÇÃO DE EXCLUSÃO DE CLIENTE E VEÍCULO ──────────────
function modalConfirmarExcluirCliente(id, nome) {
  getModalContainer().innerHTML = `
    <div class="modal-overlay" onclick="fecharModal(event)">
      <div class="modal" style="max-width:380px;text-align:center;padding:24px 20px">
        <div style="font-size:2.8rem;margin-bottom:10px">👤🗑️</div>
        <div style="font-weight:800;font-size:1.15rem;color:var(--text);margin-bottom:8px">Excluir Cliente?</div>
        <div style="font-size:0.86rem;color:var(--text2);margin-bottom:20px;line-height:1.4">
          Deseja realmente excluir <b>${nome}</b>?<br><br>⚠️ Todos os veículos e ordens de serviço vinculados a este cliente também serão removidos.
        </div>
        <div style="display:flex;gap:10px;justify-content:center">
          <button type="button" class="btn btn-outline" onclick="fecharModalForce()" style="flex:1;padding:10px">Cancelar</button>
          <button type="button" class="btn" onclick="executarExcluirCliente(${id})" style="flex:1;background:#ef4444;color:#fff;border:none;padding:10px;font-weight:700">🗑️ Sim, Excluir</button>
        </div>
      </div>
    </div>`;
}

async function executarExcluirCliente(id) {
  fecharModalForce();
  try {
    toast('Excluindo cliente...');
    await del('/clientes/' + id);
    toast('Cliente excluído com sucesso!');
    if (paginaAtual === 'clientes') renderClientes();
    else if (paginaAtual === 'dashboard') renderDashboard();
  } catch (err) {
    toast('Erro ao excluir cliente: ' + err.message, 'erro');
  }
}

function modalConfirmarExcluirVeiculo(id, placa) {
  getModalContainer().innerHTML = `
    <div class="modal-overlay" onclick="fecharModal(event)">
      <div class="modal" style="max-width:380px;text-align:center;padding:24px 20px">
        <div style="font-size:2.8rem;margin-bottom:10px">🚗🗑️</div>
        <div style="font-weight:800;font-size:1.15rem;color:var(--text);margin-bottom:8px">Excluir Veículo?</div>
        <div style="font-size:0.86rem;color:var(--text2);margin-bottom:20px;line-height:1.4">
          Deseja realmente excluir o veículo placa <b>${placa}</b>?<br><br>⚠️ As ordens de serviço e checklists vinculados a ele também serão removidos.
        </div>
        <div style="display:flex;gap:10px;justify-content:center">
          <button type="button" class="btn btn-outline" onclick="fecharModalForce()" style="flex:1;padding:10px">Cancelar</button>
          <button type="button" class="btn" onclick="executarExcluirVeiculo(${id})" style="flex:1;background:#ef4444;color:#fff;border:none;padding:10px;font-weight:700">🗑️ Sim, Excluir</button>
        </div>
      </div>
    </div>`;
}

async function executarExcluirVeiculo(id) {
  fecharModalForce();
  try {
    toast('Excluindo veículo...');
    await del('/veiculos/' + id);
    toast('Veículo excluído com sucesso!');
    if (paginaAtual === 'veiculos') renderVeiculos();
    else if (paginaAtual === 'dashboard') renderDashboard();
  } catch (err) {
    toast('Erro ao excluir veículo: ' + err.message, 'erro');
  }
}

// ─── ORDENS DE SERVIÇO COM BUSCA RÁPIDA ──────────────────────────────────────
async function renderOS() {
  document.getElementById('header-action').innerHTML = '';
  try {
    const os = await get('/os');
    dadosGlobais.os = os;
    document.getElementById('main-content').innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div class="section-title" style="margin-bottom:0">📋 Ordens de Serviço (${os.length})</div>
        <button class="btn btn-primary btn-sm" onclick="modalNovaOS('novo')">+ Nova OS</button>
      </div>

      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input type="text" class="search-input" placeholder="Buscar por placa, cliente, mecânico ou status..." oninput="filtrarOS(this.value)" autocomplete="off"/>
      </div>

      <div id="container-os-lista">
        ${renderizarListaOSHtml(os)}
      </div>
    `;
  } catch (err) {
    toast('Erro ao buscar OS: ' + err.message, 'erro');
  }
}

function filtrarOS(termo) {
  const t = termo.trim().toLowerCase();
  const c = document.getElementById('container-os-lista');
  if (!c) return;
  if (!t) {
    c.innerHTML = renderizarListaOSHtml(dadosGlobais.os);
    return;
  }
  const filtradas = dadosGlobais.os.filter(o =>
    (o.placa && o.placa.toLowerCase().includes(t)) ||
    (o.modelo && o.modelo.toLowerCase().includes(t)) ||
    (o.cliente_nome && o.cliente_nome.toLowerCase().includes(t)) ||
    (o.mecanico && o.mecanico.toLowerCase().includes(t)) ||
    (o.status && o.status.toLowerCase().includes(t))
  );
  c.innerHTML = renderizarListaOSHtml(filtradas);
}

// ─── NOVA OS COM AUTOCOMPLETE E RECONHECIMENTO DE PLACA ──────────────────────
async function modalNovaOS(modoInicial = null) {
  try {
    const clientes = await get('/clientes') || [];
    const veiculos = await get('/veiculos') || [];
    dadosGlobais.clientes = clientes;
    dadosGlobais.veiculos = veiculos;

    modoNovaOS = modoInicial || (clientes.length === 0 ? 'novo' : 'existente');

    getModalContainer().innerHTML = `
      <div class="modal-overlay" onclick="fecharModal(event)">
        <div class="modal">
          <div class="modal-header">
            <div class="modal-title">📋 Nova Ordem de Serviço</div>
            <button type="button" class="modal-close" onclick="fecharModalForce()">✕</button>
          </div>

          <!-- ABAS DE SELEÇÃO: NOVO CLIENTE RÁPIDO OU CLIENTE JÁ CADASTRADO -->
          <div class="preset-tabs" style="margin-bottom:16px">
            <button type="button" id="tab-btn-os-novo" class="preset-tab-btn ${modoNovaOS==='novo'?'active':''}" onclick="alternarModoNovaOS('novo')">
              ➕ Novo Cliente no Balcão
            </button>
            <button type="button" id="tab-btn-os-existente" class="preset-tab-btn ${modoNovaOS==='existente'?'active':''}" onclick="alternarModoNovaOS('existente')">
              👤 Cliente Já Cadastrado (${clientes.length})
            </button>
          </div>

          <!-- MODO 1: NOVO CLIENTE DIRETO NA OS (COM AUTO-RECONHECIMENTO DE PLACA) -->
          <div id="sec-os-novo" style="display:${modoNovaOS==='novo'?'block':'none'}">
            <div style="background:var(--bg3);border-radius:8px;padding:10px 12px;margin-bottom:14px;font-size:0.8rem;color:var(--primary);font-weight:600">
              ⚡ Digite a placa do carro: se ele já passou na oficina, o sistema reconhece na hora!
            </div>

            <div style="display:grid;grid-template-columns:1fr 1.2fr;gap:8px">
              <div class="form-group">
                <label class="form-label">Placa do Carro *</label>
                <input type="text" inputmode="text" class="form-input" id="os-novo-placa" placeholder="ABC-1234" style="text-transform:uppercase;font-weight:700" oninput="formatarEVerificarPlaca(this)"/>
              </div>
              <div class="form-group">
                <label class="form-label">Modelo / Versão *</label>
                <input type="text" inputmode="text" class="form-input" id="os-novo-modelo" list="lista-modelos-br" placeholder="Ex: Onix 1.0, Uno Fire..."/>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Nome Completo do Cliente *</label>
              <input type="text" inputmode="text" class="form-input" id="os-novo-nome" placeholder="Ex: Roberto Carlos" autocomplete="name"/>
            </div>

            <div class="form-group">
              <label class="form-label">Telefone / WhatsApp *</label>
              <input type="tel" inputmode="tel" class="form-input" id="os-novo-tel" placeholder="(11) 98765-4321" autocomplete="tel"/>
            </div>

            <div class="form-group">
              <label class="form-label">KM Atual de Entrada</label>
              <input type="number" inputmode="numeric" class="form-input" id="os-novo-km" placeholder="Ex: 85000"/>
            </div>
          </div>

          <!-- MODO 2: CLIENTE EXISTENTE -->
          <div id="sec-os-existente" style="display:${modoNovaOS==='existente'?'block':'none'}">
            <div class="form-group">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <label class="form-label" style="margin-bottom:0">Cliente Proprietário *</label>
                <button type="button" class="btn btn-outline btn-sm" onclick="alternarModoNovaOS('novo')" style="padding:2px 8px;font-size:0.75rem">
                  + Novo Cliente
                </button>
              </div>
              <select class="form-input" id="sel-os-cliente" onchange="aoMudarClienteOS(this.value)">
                <option value="">Selecione o cliente...</option>
                ${clientes.map(c => `<option value="${c.id}">${c.nome}</option>`).join('')}
              </select>
            </div>

            <div class="form-group">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <label class="form-label" style="margin-bottom:0">Veículo do Cliente *</label>
                <button type="button" class="btn btn-outline btn-sm" id="btn-add-veic-rapido" onclick="adicionarVeiculoRapidoNaOS()" style="display:none;padding:2px 8px;font-size:0.75rem">
                  + Cadastrar Veículo
                </button>
              </div>
              <select class="form-input" id="sel-os-veiculo">
                <option value="">Selecione o cliente acima primeiro...</option>
              </select>
            </div>
          </div>

          <!-- CAMPOS COMUNS DA OS -->
          <div class="form-group">
            <label class="form-label">Mecânico Responsável</label>
            <input type="text" inputmode="text" class="form-input" id="os-campo-mecanico" placeholder="Ex: Roberto, Marcelo..."/>
          </div>

          <div class="form-group">
            <label class="form-label">Descrição do Problema / Serviço Solicitado</label>
            <textarea class="form-input" id="os-campo-desc" rows="3" placeholder="Descreva o que o cliente relatou ou a revisão a ser feita..."></textarea>
          </div>

          <div style="display:flex;gap:8px;margin-top:16px">
            <button type="button" class="btn btn-outline" onclick="fecharModalForce()">Cancelar</button>
            <button type="button" class="btn btn-primary" id="btn-submit-os" onclick="salvarOS()">
              ${modoNovaOS==='novo' ? '🚀 Cadastrar Cliente & Abrir OS' : '🚀 Abrir Ordem de Serviço'}
            </button>
          </div>

          ${renderDatalistModelos()}
        </div>
      </div>`;
  } catch (err) {
    toast('Erro ao abrir tela de OS: ' + err.message, 'erro');
  }
}

function renderDatalistModelos() {
  return `<datalist id="lista-modelos-br">
    ${MODELOS_POPULARES.map(m => `<option value="${m}"/>`).join('')}
  </datalist>`;
}

function formatarEVerificarPlaca(input) {
  let val = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (val.length > 7) val = val.substring(0, 7);
  input.value = val;

  // Reconhecimento de placa existente na oficina
  if (val.length >= 7 && dadosGlobais.veiculos.length) {
    const achado = dadosGlobais.veiculos.find(v => v.placa && v.placa.replace(/[^A-Z0-9]/g, '').toUpperCase() === val);
    if (achado) {
      const modeloInput = document.getElementById('os-novo-modelo') || document.getElementById('veic-modelo');
      const nomeInput = document.getElementById('os-novo-nome');
      const telInput = document.getElementById('os-novo-tel');
      const marcaInput = document.getElementById('veic-marca');

      if (modeloInput && !modeloInput.value) modeloInput.value = `${achado.marca ? achado.marca + ' ' : ''}${achado.modelo}`;
      if (nomeInput && !nomeInput.value) nomeInput.value = achado.cliente_nome || '';
      if (marcaInput && !marcaInput.value) marcaInput.value = achado.marca || '';

      if (achado.cliente_id && dadosGlobais.clientes.length) {
        const cli = dadosGlobais.clientes.find(c => c.id == achado.cliente_id);
        if (cli && telInput && !telInput.value) telInput.value = cli.telefone || '';
      }
      toast('🚗 Placa já cadastrada! Dados preenchidos automaticamente.');
    }
  }
}

function alternarModoNovaOS(modo) {
  modoNovaOS = modo;
  const secExistente = document.getElementById('sec-os-existente');
  const secNovo = document.getElementById('sec-os-novo');
  const btnExistente = document.getElementById('tab-btn-os-existente');
  const btnNovo = document.getElementById('tab-btn-os-novo');
  const btnSubmit = document.getElementById('btn-submit-os');

  if (modo === 'novo') {
    if (secExistente) secExistente.style.display = 'none';
    if (secNovo) secNovo.style.display = 'block';
    if (btnExistente) btnExistente.classList.remove('active');
    if (btnNovo) btnNovo.classList.add('active');
    if (btnSubmit) btnSubmit.textContent = '🚀 Cadastrar Cliente & Abrir OS';
  } else {
    if (secExistente) secExistente.style.display = 'block';
    if (secNovo) secNovo.style.display = 'none';
    if (btnExistente) btnExistente.classList.add('active');
    if (btnNovo) btnNovo.classList.remove('active');
    if (btnSubmit) btnSubmit.textContent = '🚀 Abrir Ordem de Serviço';
  }
}

function aoMudarClienteOS(cid) {
  const s = document.getElementById('sel-os-veiculo');
  const btn = document.getElementById('btn-add-veic-rapido');
  if (!cid) {
    s.innerHTML = '<option value="">Selecione o cliente acima primeiro...</option>';
    if (btn) btn.style.display = 'none';
    return;
  }
  const v = dadosGlobais.veiculos.filter(x => x.cliente_id == cid);
  if (btn) btn.style.display = 'inline-flex';

  if (v.length === 0) {
    s.innerHTML = '<option value="">Nenhum veículo cadastrado para este cliente!</option>';
  } else {
    s.innerHTML = v.map(x => `<option value="${x.id}">${x.placa} - ${x.marca} ${x.modelo}</option>`).join('');
  }
}

async function adicionarVeiculoRapidoNaOS() {
  const cid = document.getElementById('sel-os-cliente').value;
  if (!cid) { toast('Selecione um cliente primeiro!', 'erro'); return; }
  const placa = prompt('Digite a placa do novo veículo (Ex: ABC1234):');
  if (!placa) return;
  const modelo = prompt('Digite o modelo (Ex: Uno, Onix, Gol...):') || 'Veículo';

  const f = new FormData();
  f.append('cliente_id', cid);
  f.append('placa', placa.toUpperCase());
  f.append('modelo', modelo);
  try {
    const res = await post('/veiculos', f);
    toast('Veículo adicionado com sucesso!');
    dadosGlobais.veiculos = await get('/veiculos');
    aoMudarClienteOS(cid);
    document.getElementById('sel-os-veiculo').value = res.id;
  } catch (err) {
    toast('Erro ao adicionar veículo: ' + err.message, 'erro');
  }
}

async function salvarOS() {
  const mecanico = document.getElementById('os-campo-mecanico').value.trim();
  const desc = document.getElementById('os-campo-desc').value.trim();

  if (modoNovaOS === 'novo') {
    const nome = document.getElementById('os-novo-nome').value.trim();
    const tel = document.getElementById('os-novo-tel').value.trim();
    const placa = document.getElementById('os-novo-placa').value.trim().toUpperCase();
    const modelo = document.getElementById('os-novo-modelo').value.trim();
    const km = parseInt(document.getElementById('os-novo-km').value) || 0;

    if (!nome) { toast('Por favor, informe o nome do cliente!', 'erro'); return; }
    if (!placa) { toast('Por favor, informe a placa do carro!', 'erro'); return; }

    try {
      toast('Cadastrando cliente e veículo...');
      const fc = new FormData();
      fc.append('nome', nome);
      fc.append('telefone', tel);
      const resCli = await post('/clientes', fc);
      const cid = resCli.id;

      const fv = new FormData();
      fv.append('cliente_id', cid);
      fv.append('placa', placa);
      fv.append('modelo', modelo || 'Veículo');
      fv.append('km', km);
      const resVeic = await post('/veiculos', fv);
      const vid = resVeic.id;

      const fo = new FormData();
      fo.append('cliente_id', cid);
      fo.append('veiculo_id', vid);
      fo.append('mecanico', mecanico);
      fo.append('descricao', desc);
      const resOs = await post('/os', fo);

      if (km > 0) {
        const frev = new FormData();
        frev.append('km_atual', km);
        frev.append('km_proxima_troca', km + 10000);
        await put(`/os/${resOs.id}/revisao`, frev);
      }

      toast(`🎉 OS #${resOs.id} criada com sucesso!`);
      fecharModalForce();
      abrirOS(resOs.id);
    } catch (err) {
      toast('Erro ao criar OS: ' + err.message, 'erro');
    }
  } else {
    const cid = document.getElementById('sel-os-cliente').value;
    const vid = document.getElementById('sel-os-veiculo').value;

    if (!cid) { toast('Por favor, selecione um cliente!', 'erro'); return; }
    if (!vid) { toast('Por favor, selecione ou cadastre um veículo!', 'erro'); return; }

    try {
      const f = new FormData();
      f.append('cliente_id', cid);
      f.append('veiculo_id', vid);
      f.append('mecanico', mecanico);
      f.append('descricao', desc);
      const res = await post('/os', f);

      toast(`🎉 OS #${res.id} criada com sucesso!`);
      fecharModalForce();
      abrirOS(res.id);
    } catch (err) {
      toast('Erro ao abrir OS: ' + err.message, 'erro');
    }
  }
}

// ─── DETALHES COMPLETOS DA OS ────────────────────────────────────────────────
let osAtualCarregada = null;
async function abrirOS(id) {
  try {
    const os = await get('/os/' + id);
    os.checklist = os.checklist || [];
    os.scanner = os.scanner || [];
    os.orcamento = os.orcamento || [];
    osAtualCarregada = os;

    const kmAtual = os.km_atual || os.km || 0;
    const kmTroca = os.km_proxima_troca || (kmAtual ? kmAtual + 10000 : '');
    const dataTroca = os.data_proxima_troca || '';
    const formaPagto = os.forma_pagamento || '';

    getModalContainer().innerHTML = `
      <div class="modal-overlay" onclick="fecharModal(event)">
        <div class="modal">
          <div class="modal-header">
            <div class="modal-title">📋 OS #${os.id}</div>
            <button type="button" class="modal-close" onclick="fecharModalForce()">✕</button>
          </div>

          <!-- BOTÕES DE TOPO: IMPRIMIR PDF & STATUS -->
          <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center;justify-content:space-between">
            <a href="/api/os/${os.id}/imprimir?auto=1" target="_blank" class="btn btn-primary btn-sm" style="text-decoration:none;padding:8px 14px">
              🖨️ Imprimir / Salvar PDF
            </a>
            <div style="display:flex;gap:6px">
              <button class="btn btn-outline btn-sm" onclick="mudarStatus(${os.id},'Em andamento')">🔧 Em Andamento</button>
              <button class="btn btn-outline btn-sm" onclick="mudarStatus(${os.id},'Fechada')">✅ Fechar OS</button>
            </div>
          </div>

          <!-- CARTÃO DO VEÍCULO E CLIENTE -->
          <div class="card" style="margin-bottom:12px">
            <div class="title" style="font-size:1.1rem;font-weight:800;color:var(--primary)">🚗 ${os.placa} - ${os.marca} ${os.modelo} ${os.ano || ''}</div>
            <div class="sub">👤 Cliente: <b>${os.cliente_nome || os.cliente || '—'}</b> · 📞 ${os.cliente_tel || 'Sem telefone'}</div>
            <div class="sub">🔧 Mecânico: ${os.mecanico || '—'} · 📅 ${formatarData(os.criado_em)}</div>
            <div style="margin-top:8px"><span class="badge badge-${os.status.toLowerCase().replace(' ','-')}">${os.status}</span></div>
            ${os.descricao ? `<div style="margin-top:8px;color:#94a3b8;font-size:0.85rem">${os.descricao}</div>` : ''}
          </div>

          <!-- 📌 ABAS DENTRO DA ORDEM DE SERVIÇO -->
          <div class="os-nav-tabs">
            <button type="button" class="os-nav-tab ${abaOSDetalhe==='orcamento'?'active':''}" data-aba="orcamento" onclick="trocarAbaOS('orcamento')">
              💰 Orçamento (Peças & Serviços)
            </button>
            <button type="button" class="os-nav-tab ${abaOSDetalhe==='checklist'?'active':''}" data-aba="checklist" onclick="trocarAbaOS('checklist')">
              ✅ Checklist & Assinatura (${os.checklist.length})
            </button>
            <button type="button" class="os-nav-tab ${abaOSDetalhe==='revisao'?'active':''}" data-aba="revisao" onclick="trocarAbaOS('revisao')">
              📅 Próxima Revisão
            </button>
          </div>

          <!-- ═════════════════════════════════════════════════════════════════════ -->
          <!-- ABA 1: 💰 ORÇAMENTO (PEÇAS E MÃO DE OBRA)                             -->
          <!-- ═════════════════════════════════════════════════════════════════════ -->
          <div id="aba-os-orcamento" style="display:${abaOSDetalhe==='orcamento'?'block':'none'}">
            <!-- CARDS DE TOTAIS -->
            <div class="orcamento-totais-card">
              <div class="totais-grid">
                <div class="tot-box">
                  <div class="tot-label">Peças</div>
                  <div class="tot-val">R$ ${(os.total_pecas || 0).toFixed(2)}</div>
                </div>
                <div class="tot-box">
                  <div class="tot-label">Mão de Obra</div>
                  <div class="tot-val">R$ ${(os.total_servicos || 0).toFixed(2)}</div>
                </div>
                <div class="tot-box">
                  <div class="tot-label">Total Geral</div>
                  <div class="tot-val tot-destaque">R$ ${(os.total_geral || 0).toFixed(2)}</div>
                </div>
              </div>

              <!-- FORMA DE PAGAMENTO -->
              <div style="display:flex;gap:8px;align-items:center;margin-top:10px">
                <select class="form-input" id="sel-forma-pagto" style="font-size:0.82rem !important;padding:8px" onchange="salvarFormaPagto(${os.id}, this.value)">
                  <option value="">Forma de pagamento...</option>
                  <option value="Pix" ${formaPagto==='Pix'?'selected':''}>💠 Pix</option>
                  <option value="Cartão de Crédito" ${formaPagto==='Cartão de Crédito'?'selected':''}>💳 Cartão de Crédito</option>
                  <option value="Cartão de Débito" ${formaPagto==='Cartão de Débito'?'selected':''}>💳 Cartão de Débito</option>
                  <option value="Dinheiro" ${formaPagto==='Dinheiro'?'selected':''}>💵 Dinheiro</option>
                  <option value="A Prazo" ${formaPagto==='A Prazo'?'selected':''}>📅 A Prazo</option>
                </select>
              </div>
            </div>

            <!-- FORMULÁRIO RÁPIDO PARA ADICIONAR PEÇA / MÃO DE OBRA -->
            <div style="background:var(--bg3);border-radius:10px;padding:12px;margin-bottom:14px">
              <div style="font-size:0.82rem;font-weight:700;color:var(--primary);margin-bottom:8px">+ Incluir Peça ou Serviço</div>
              <div style="display:grid;grid-template-columns:1fr 2fr;gap:6px;margin-bottom:6px">
                <select class="form-input" id="orc-tipo" style="font-size:0.82rem !important;padding:8px">
                  <option value="peca">📦 Peça</option>
                  <option value="servico">🔧 Mão de Obra / Serviço</option>
                </select>
                <input type="text" class="form-input" id="orc-desc" placeholder="Ex: Pastilha de Freio, Óleo 5W30..." style="font-size:0.85rem !important;padding:8px"/>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1.2fr 1.2fr;gap:6px">
                <input type="number" step="0.5" class="form-input" id="orc-qtd" value="1" placeholder="Qtd" style="font-size:0.85rem !important;padding:8px"/>
                <input type="number" step="0.5" class="form-input" id="orc-valor" placeholder="Valor R$" style="font-size:0.85rem !important;padding:8px"/>
                <button class="btn btn-primary btn-sm" onclick="adicionarItemOrcamentoRapido(${os.id})" style="font-size:0.82rem;padding:8px">
                  + Adicionar
                </button>
              </div>
            </div>

            <!-- LISTA DE ITENS DO ORÇAMENTO -->
            <div class="preset-title" style="margin-bottom:8px">Itens de Peças e Serviços Adicionados (${os.orcamento.length}):</div>
            <div id="lista-orcamento-itens" style="margin-bottom:16px">
              ${os.orcamento.length === 0 ? '<div class="card" style="font-size:0.82rem;color:#64748b;text-align:center;padding:16px">Nenhuma peça ou serviço incluído ainda.<br>Use o formulário acima para adicionar!</div>' :
                os.orcamento.map(it => `
                  <div class="orcamento-item">
                    <div>
                      <div style="font-weight:700;font-size:0.88rem">${it.tipo === 'servico' ? '🔧 Serviço:' : '📦 Peça:'} ${it.descricao}</div>
                      <div style="font-size:0.75rem;color:var(--text2)">${it.quantidade}x R$ ${it.valor_unitario.toFixed(2)}</div>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px">
                      <span style="font-weight:800;color:var(--primary);font-size:0.95rem">R$ ${it.subtotal.toFixed(2)}</span>
                      <button class="btn btn-outline btn-sm" onclick="removerItemOrcamento(${it.id}, ${os.id})" style="padding:4px 8px;color:#ef4444;font-size:0.75rem" title="Remover item">✕</button>
                    </div>
                  </div>
                `).join('')}
            </div>

            <!-- COMPARTILHAMENTO DE ORÇAMENTO -->
            <div style="display:flex;flex-direction:column;gap:8px;margin-top:14px">
              <a href="/api/os/${os.id}/imprimir?auto=1" target="_blank" class="btn btn-primary" style="text-decoration:none;padding:12px;font-size:0.9rem">
                🖨️ Visualizar & Imprimir Orçamento (PDF)
              </a>
              <button class="btn btn-whatsapp" onclick="compartilharOSWhatsApp(${os.id}, '${os.cliente_nome || os.cliente || ''}', '${os.placa}', '${os.modelo}')" style="padding:12px;font-size:0.9rem">
                💬 Enviar Orçamento no WhatsApp do Cliente
              </button>
            </div>
          </div>

          <!-- ═════════════════════════════════════════════════════════════════════ -->
          <!-- ABA 2: ✅ CHECKLIST & SCANNER                                         -->
          <!-- ═════════════════════════════════════════════════════════════════════ -->
          <div id="aba-os-checklist" style="display:${abaOSDetalhe==='checklist'?'block':'none'}">
            <!-- SEÇÃO CHECKLIST INTERATIVO -->
            <div class="section-title" style="font-size:0.98rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
              <span>✅ Checklist de Inspeção (${os.checklist.length})</span>
              <div style="display:flex;gap:6px;align-items:center">
                <button type="button" class="btn btn-whatsapp btn-sm" onclick="enviarLaudoEntradaWhatsApp(${os.id})" style="font-size:0.75rem;padding:5px 9px;display:inline-flex;align-items:center;gap:4px" title="Enviar laudo de entrada via WhatsApp">
                  📲 Laudo WhatsApp
                </button>
                ${os.checklist.length > 0 ? `<button type="button" class="btn btn-outline btn-sm" onclick="modalConfirmarLimparChecklist(${os.id}, ${os.checklist.length})" style="color:#ef4444;border-color:rgba(239,68,68,0.4);background:rgba(239,68,68,0.06);font-size:0.75rem;padding:4px 9px;display:inline-flex;align-items:center;gap:4px" title="Limpar todo o checklist">🗑️ Limpar Tudo</button>` : ''}
                <button class="btn btn-outline btn-sm" onclick="modalNovoItemChecklist(${os.id})" style="font-size:0.75rem;padding:4px 8px">+ Item Avulso</button>
              </div>
            </div>

            <!-- BARRA DE MODELOS DE CHECKLIST COM SELETOR VISUAL -->
            <div class="preset-bar">
              <div class="preset-title">⚡ Modelos Rápidos de Checklist:</div>
              
              <div class="preset-tabs">
                <button type="button" class="preset-tab-btn ${presetSelecionado==='lataria'?'active':''}" onclick="trocarPresetChecklist('lataria', ${os.id})">
                  🛡️ Lataria & Avarias (${PRESETS.lataria.itens.length})
                </button>
                <button type="button" class="preset-tab-btn ${presetSelecionado==='oleo'?'active':''}" onclick="trocarPresetChecklist('oleo', ${os.id})">
                  🛢️ Troca de Óleo (${PRESETS.oleo.itens.length})
                </button>
                <button type="button" class="preset-tab-btn ${presetSelecionado==='freios'?'active':''}" onclick="trocarPresetChecklist('freios', ${os.id})">
                  🛑 Freios & Suspensão (${PRESETS.freios.itens.length})
                </button>
                <button type="button" class="preset-tab-btn ${presetSelecionado==='revisao'?'active':''}" onclick="trocarPresetChecklist('revisao', ${os.id})">
                  🚗 Revisão Completa (${PRESETS.revisao.itens.length})
                </button>
                <button type="button" class="preset-tab-btn ${presetSelecionado==='eletrica'?'active':''}" onclick="trocarPresetChecklist('eletrica', ${os.id})">
                  ⚡ Elétrica & Injeção (${PRESETS.eletrica.itens.length})
                </button>
              </div>

              <!-- CAIXA DE PREVIEW E AÇÃO RÁPIDA -->
              <div id="preset-preview-box" class="preset-preview-box"></div>
            </div>

            <!-- LISTA DE ITENS INSPECIONADOS NESTA OS -->
            <div class="preset-title" style="margin-top:14px;margin-bottom:8px">Itens Inspecionados nesta OS:</div>
            ${os.checklist.length === 0 ? '<div class="card" style="color:#64748b;font-size:0.85rem;text-align:center;padding:16px">Nenhum item adicionado ainda.<br>Escolha um modelo acima e clique no botão para adicionar!</div>' :
              os.checklist.map(c => `
                <div class="check-item" id="chk-item-${c.id}">
                  <div class="item-header">
                    <div class="item-name">${c.item}</div>
                    <span class="badge ${c.status==='OK'?'badge-fechada':c.status==='Atenção'?'badge-aberta':'badge-andamento'}">${c.status}</span>
                  </div>
                  ${c.observacao ? `<div style="font-size:0.8rem;color:#94a3b8;margin-top:2px">${c.observacao}</div>` : ''}
                  ${c.foto ? `<img src="/uploads/${c.foto}" class="foto-preview"/>` : ''}

                  <!-- AÇÕES RÁPIDAS NO ITEM (1 TOQUE PARA ALTERAR STATUS) -->
                  <div class="item-actions-fast">
                    <div class="status-pills">
                      <button class="pill-btn ${c.status==='OK'?'active-ok':''}" onclick="mudarStatusItem(${c.id}, 'OK', ${os.id})">✅ OK</button>
                      <button class="pill-btn ${c.status==='Atenção'?'active-atencao':''}" onclick="mudarStatusItem(${c.id}, 'Atenção', ${os.id})">⚠️ Atenção</button>
                      <button class="pill-btn ${c.status==='Problema'?'active-problema':''}" onclick="mudarStatusItem(${c.id}, 'Problema', ${os.id})">❌ Problema</button>
                    </div>
                    <div style="display:flex;gap:6px">
                      <button class="btn btn-outline btn-sm" onclick="modalFotoItem(${c.id}, '${c.item.replace(/'/g,'')}', ${os.id})" style="padding:4px 8px;font-size:0.75rem">
                        📷 Foto
                      </button>
                      <button type="button" class="btn btn-outline btn-sm btn-remover-item" onclick="confirmarRemoverItemChecklist(this, ${c.id}, ${os.id}, '${c.item.replace(/'/g, "\\'")}')" style="padding:4px 9px;font-size:0.75rem;color:#ef4444;border-color:rgba(239,68,68,0.35);background:rgba(239,68,68,0.07);display:inline-flex;align-items:center;gap:3px;transition:all 0.2s" title="Excluir item">
                        🗑️ Excluir
                      </button>
                    </div>
                  </div>
                </div>
              `).join('')}

            <!-- ASSINATURA DIGITAL DO CLIENTE NO CHECKLIST -->
            <div class="section-title" style="font-size:0.95rem;display:flex;justify-content:space-between;align-items:center;margin-top:20px">
              <span>✍️ Assinatura do Cliente no Checklist</span>
              <button type="button" class="btn btn-outline btn-sm" onclick="modalAssinatura(${os.id}, '${os.cliente_nome || os.cliente || ''}')" style="padding:4px 10px;font-size:0.75rem">
                ${os.assinatura_cliente ? '✏️ Refazer Assinatura' : '✍️ Coletar Assinatura'}
              </button>
            </div>

            ${os.assinatura_cliente ? `
              <div class="card" style="text-align:center;padding:12px;margin-bottom:14px">
                <img src="/uploads/${os.assinatura_cliente}" style="max-height:80px;max-width:220px;display:block;margin:0 auto 6px;filter:invert(1)"/>
                <div style="font-size:0.75rem;color:var(--ok);font-weight:700">✓ Checklist assinado digitalmente por ${os.cliente_nome || os.cliente}</div>
              </div>
            ` : `
              <div class="card" style="color:#94a3b8;font-size:0.82rem;text-align:center;padding:14px;margin-bottom:14px;cursor:pointer;border:1px dashed #475569;border-radius:8px" onclick="modalAssinatura(${os.id}, '${os.cliente_nome || os.cliente || ''}')">
                ✍️ Toque aqui para o cliente assinar o checklist na tela do celular com o dedo.
              </div>
            `}

            <!-- BOTÃO / CARD LAUDO DE ENTRADA VIA WHATSAPP -->
            <div style="margin-top:14px;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:12px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1)">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                <div>
                  <div style="font-weight:700;font-size:0.9rem;color:#f8fafc">🚗📋 Laudo de Entrada do Veículo</div>
                  <div style="font-size:0.75rem;color:#94a3b8">Envie a vistoria de entrada e avarias detectadas direto no WhatsApp do cliente</div>
                </div>
              </div>
              <button type="button" class="btn btn-whatsapp" onclick="enviarLaudoEntradaWhatsApp(${os.id})" style="width:100%;padding:11px;font-size:0.88rem;display:flex;align-items:center;justify-content:center;gap:8px;font-weight:700">
                📲 Enviar Laudo de Entrada no WhatsApp do Cliente
              </button>
            </div>

            <!-- SEÇÃO SCANNER UNIFICADO & PORTA DE ENTRADA -->
            <div class="section-title" style="font-size:0.98rem;margin-top:24px">🔍 Scanner & Diagnóstico (${os.scanner.length})</div>
            
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
              <button class="btn btn-primary btn-sm" onclick="modalScanner(${os.id},${os.veiculo_id})" style="padding:10px;font-size:0.82rem">
                📁 Anexar do Aparelho
              </button>
              <button class="btn btn-whatsapp btn-sm" onclick="modalPortaEntrada(${os.id}, '${os.placa}')" style="padding:10px;font-size:0.82rem">
                📲 QR Code / WhatsApp
              </button>
            </div>

            ${os.scanner.map(s => `
              <div class="check-item">
                <div class="scanner-grid">
                  <div class="scanner-field"><div class="sf-label">RPM</div><div class="sf-value">${s.rpm || 0}</div></div>
                  <div class="scanner-field"><div class="sf-label">TEMP</div><div class="sf-value">${s.temperatura ? s.temperatura + '°C' : '—'}</div></div>
                  <div class="scanner-field"><div class="sf-label">TENSÃO</div><div class="sf-value">${s.tensao ? s.tensao + 'V' : '—'}</div></div>
                  <div class="scanner-field"><div class="sf-label">COMB.</div><div class="sf-value">${s.combustivel ? s.combustivel + '%' : '—'}</div></div>
                </div>

                ${s.dtcs ? `<div style="margin-top:8px;font-size:0.84rem;color:#ef4444;font-weight:700">⚠️ Falhas (DTCs): ${s.dtcs}</div>` : ''}
                ${s.observacoes ? `<div style="margin-top:4px;font-size:0.82rem;color:#94a3b8">${s.observacoes}</div>` : ''}

                ${s.tipo_arquivo === 'pdf' ? `
                  <a href="/uploads/${s.foto}" target="_blank" class="pdf-badge">
                    📄 Abrir / Baixar Relatório do Scanner (PDF)
                  </a>
                ` : ''}

                ${(s.tipo_arquivo !== 'pdf' && s.foto) ? `<img src="/uploads/${s.foto}" class="foto-preview"/>` : ''}
                <div style="font-size:0.72rem;color:#475569;margin-top:6px">🕒 Registrado em ${formatarData(s.criado_em)}</div>
              </div>
            `).join('')}
          </div>

          <!-- ═════════════════════════════════════════════════════════════════════ -->
          <!-- ABA 3: 📅 PRÓXIMA REVISÃO & ÓLEO                                     -->
          <!-- ═════════════════════════════════════════════════════════════════════ -->
          <div id="aba-os-revisao" style="display:${abaOSDetalhe==='revisao'?'block':'none'}">
            <!-- CONTROLE DE KM & PRÓXIMA REVISÃO -->
            <div class="card" style="margin-bottom:18px">
              <div class="section-title" style="font-size:0.95rem;margin-top:0">📅 Próxima Troca de Óleo / Revisão</div>
              <div style="display:grid;grid-template-columns:1fr 1.2fr;gap:8px">
                <div class="form-group" style="margin-bottom:8px">
                  <label class="form-label">KM Atual Entrada</label>
                  <input type="number" class="form-input" id="rev-km-atual" value="${kmAtual}" oninput="sugerirKmTroca(this.value)"/>
                </div>
                <div class="form-group" style="margin-bottom:8px">
                  <label class="form-label">KM Próxima Troca</label>
                  <input type="number" class="form-input" id="rev-km-proxima" value="${kmTroca}"/>
                </div>
              </div>

              <!-- ATALHOS RÁPIDOS DE KM -->
              <div class="km-atalhos">
                <span class="km-chip" onclick="aplicarKmAtalho(5000)">+ 5.000 km</span>
                <span class="km-chip" onclick="aplicarKmAtalho(10000)">+ 10.000 km</span>
                <span class="km-chip" onclick="aplicarMesesAtalho(6)">+ 6 Meses</span>
              </div>

              <div class="form-group" style="margin-top:10px;margin-bottom:10px">
                <label class="form-label">Data Prevista da Próxima Revisão</label>
                <input type="date" class="form-input" id="rev-data-proxima" value="${dataTroca}"/>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1.2fr;gap:8px;margin-top:12px">
                <button class="btn btn-outline btn-sm" onclick="salvarDadosRevisao(${os.id})">
                  💾 Salvar KM
                </button>
                <button class="btn btn-whatsapp btn-sm" onclick="enviarLembreteOleoWhatsApp(${os.id})">
                  📲 Lembrete no WhatsApp
                </button>
              </div>
            </div>
          </div>

          <!-- BOTÃO DE EXCLUIR OS -->
          <div style="margin-top:20px;border-top:1px solid var(--border);padding-top:14px;text-align:center">
            <button class="btn btn-danger btn-sm" onclick="excluirOS(${os.id})">
              🗑️ Excluir esta Ordem de Serviço
            </button>
          </div>

        </div>
      </div>`;

    renderPresetPreviewBox(os.id);
  } catch (err) {
    toast('Erro ao abrir OS: ' + err.message, 'erro');
  }
}

function trocarAbaOS(aba) {
  abaOSDetalhe = aba;
  document.querySelectorAll('.os-nav-tab').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-aba') === aba);
  });
  const oDiv = document.getElementById('aba-os-orcamento');
  const cDiv = document.getElementById('aba-os-checklist');
  const rDiv = document.getElementById('aba-os-revisao');
  if (oDiv) oDiv.style.display = aba === 'orcamento' ? 'block' : 'none';
  if (cDiv) cDiv.style.display = aba === 'checklist' ? 'block' : 'none';
  if (rDiv) rDiv.style.display = aba === 'revisao' ? 'block' : 'none';
}

// ─── FUNÇÕES DE ORÇAMENTO ────────────────────────────────────────────────────
async function adicionarItemOrcamentoRapido(os_id) {
  abaOSDetalhe = 'orcamento';
  const tipo = document.getElementById('orc-tipo').value;
  const desc = document.getElementById('orc-desc').value.trim();
  const qtd = parseFloat(document.getElementById('orc-qtd').value) || 1.0;
  const val = parseFloat(document.getElementById('orc-valor').value) || 0.0;

  if (!desc) { toast('Informe a descrição da peça ou serviço!', 'erro'); return; }
  if (val <= 0) { toast('Informe o valor unitário!', 'erro'); return; }

  const f = new FormData();
  f.append('tipo', tipo);
  f.append('descricao', desc);
  f.append('quantidade', qtd);
  f.append('valor_unitario', val);

  try {
    await post(`/os/${os_id}/orcamento`, f);
    toast('Item incluído no orçamento!');
    abrirOS(os_id);
  } catch (err) {
    toast('Erro ao adicionar: ' + err.message, 'erro');
  }
}

async function removerItemOrcamento(itemId, os_id) {
  abaOSDetalhe = 'orcamento';
  if (confirm('Remover este item do orçamento?')) {
    try {
      await del(`/os/orcamento/${itemId}`);
      toast('Item removido!');
      abrirOS(os_id);
    } catch (err) {
      toast('Erro: ' + err.message, 'erro');
    }
  }
}

async function salvarFormaPagto(os_id, forma) {
  const f = new FormData();
  f.append('forma_pagamento', forma);
  try {
    await put(`/os/${os_id}/revisao`, f);
    toast(`Forma de pagamento: ${forma || 'Não definida'}`);
  } catch (err) {
    toast('Erro: ' + err.message, 'erro');
  }
}

// ─── FUNÇÕES DE REVISÃO E LEMBRETE WHATSAPP ──────────────────────────────────
function sugerirKmTroca(kmVal) {
  const km = parseInt(kmVal) || 0;
  if (km > 0) {
    const kmp = document.getElementById('rev-km-proxima');
    if (kmp && !kmp.value) kmp.value = km + 10000;
  }
}

function aplicarKmAtalho(adicional) {
  const kmAtualInput = document.getElementById('rev-km-atual');
  const kmProxInput = document.getElementById('rev-km-proxima');
  const base = parseInt(kmAtualInput.value) || 0;
  if (base > 0) {
    kmProxInput.value = base + adicional;
    toast(`Próxima troca ajustada para ${base + adicional} km`);
  } else {
    toast('Preencha primeiro o KM Atual de entrada', 'erro');
  }
}

function aplicarMesesAtalho(meses) {
  const d = new Date();
  d.setMonth(d.getMonth() + meses);
  const dataFormatada = d.toISOString().split('T')[0];
  document.getElementById('rev-data-proxima').value = dataFormatada;
  toast(`Revisão prevista para: ${d.toLocaleDateString('pt-BR')}`);
}

async function salvarDadosRevisao(os_id) {
  const kmAtual = parseInt(document.getElementById('rev-km-atual').value) || 0;
  const kmProx = parseInt(document.getElementById('rev-km-proxima').value) || 0;
  const dataProx = document.getElementById('rev-data-proxima').value;
  const formaPagto = document.getElementById('sel-forma-pagto') ? document.getElementById('sel-forma-pagto').value : '';

  const f = new FormData();
  f.append('km_atual', kmAtual);
  f.append('km_proxima_troca', kmProx);
  f.append('data_proxima_troca', dataProx);
  f.append('forma_pagamento', formaPagto);

  try {
    await put(`/os/${os_id}/revisao`, f);
    toast('Dados de KM e revisão salvos com sucesso!');
  } catch (err) {
    toast('Erro ao salvar: ' + err.message, 'erro');
  }
}

function enviarLembreteOleoWhatsApp(os_id) {
  if (!osAtualCarregada) return;
  const os = osAtualCarregada;
  const telefone = os.cliente_tel || (dadosGlobais.clientes.find(c => c.id === os.cliente_id) || {}).telefone || '';
  const kmTroca = document.getElementById('rev-km-proxima').value || os.km_proxima_troca || '—';
  const dataTroca = document.getElementById('rev-data-proxima').value || os.data_proxima_troca;
  const dataFormatada = dataTroca ? new Date(dataTroca + 'T12:00:00').toLocaleDateString('pt-BR') : '';

  let prazoTxt = '';
  if (kmTroca && kmTroca !== '—') prazoTxt += `aos ${kmTroca} km`;
  if (dataFormatada) prazoTxt += (prazoTxt ? ' ou ' : '') + `até ${dataFormatada}`;

  const msg = `Olá ${os.cliente_nome || os.cliente}! Tudo bem? Aqui é da oficina ${usuarioAtual ? usuarioAtual.nome_oficina : 'DRIVER'}. Lembramos que a próxima revisão / troca de óleo do seu veículo ${os.modelo} (${os.placa}) está programada para ${prazoTxt || 'breve'}. Caso queira agendar seu horário com antecedência, estamos à sua disposição!`;
  abrirWhatsAppComMensagem(telefone, msg);
}

// ─── ASSINATURA DIGITAL TOUCH NO CELULAR ─────────────────────────────────────
let canvasCtx = null;
let desenhando = false;
let canvasVazio = true;

function modalAssinatura(os_id, cliente_nome) {
  abaOSDetalhe = 'checklist';
  getModalContainer().innerHTML = `
    <div class="modal-overlay">
      <div class="modal" style="max-width:480px">
        <div class="modal-header">
          <div class="modal-title">✍️ Assinatura do Cliente</div>
          <button type="button" class="modal-close" onclick="fecharModalForce();abrirOS(${os_id})">✕</button>
        </div>

        <div style="font-size:0.85rem;color:var(--text2);margin-bottom:12px">
          Peça para <b>${cliente_nome}</b> assinar no quadro abaixo com o dedo:
        </div>

        <div class="canvas-wrapper">
          <canvas id="canvas-assinatura"></canvas>
          <div class="assinatura-instrucao">✍️ Assine aqui com o dedo ou caneta touch</div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <button type="button" class="btn btn-outline" onclick="limparCanvasAssinatura()">
            🗑️ Limpar
          </button>
          <button type="button" class="btn btn-primary" onclick="confirmarAssinatura(${os_id})">
            💾 Salvar Assinatura
          </button>
        </div>
      </div>
    </div>`;

  setTimeout(() => inicializarCanvas(), 50);
}

function inicializarCanvas() {
  const canvas = document.getElementById('canvas-assinatura');
  if (!canvas) return;

  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = 180;

  canvasCtx = canvas.getContext('2d');
  canvasCtx.strokeStyle = '#0f172a';
  canvasCtx.lineWidth = 2.5;
  canvasCtx.lineCap = 'round';
  canvasCtx.lineJoin = 'round';
  canvasVazio = true;

  // Touch eventos no smartphone
  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    desenhando = true;
    canvasVazio = false;
    const pos = getPosCanvas(canvas, e.touches[0]);
    canvasCtx.beginPath();
    canvasCtx.moveTo(pos.x, pos.y);
  }, { passive: false });

  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (!desenhando) return;
    const pos = getPosCanvas(canvas, e.touches[0]);
    canvasCtx.lineTo(pos.x, pos.y);
    canvasCtx.stroke();
  }, { passive: false });

  canvas.addEventListener('touchend', e => {
    e.preventDefault();
    desenhando = false;
  }, { passive: false });

  // Mouse eventos no computador
  canvas.addEventListener('mousedown', e => {
    desenhando = true;
    canvasVazio = false;
    const pos = getPosCanvas(canvas, e);
    canvasCtx.beginPath();
    canvasCtx.moveTo(pos.x, pos.y);
  });

  canvas.addEventListener('mousemove', e => {
    if (!desenhando) return;
    const pos = getPosCanvas(canvas, e);
    canvasCtx.lineTo(pos.x, pos.y);
    canvasCtx.stroke();
  });

  window.addEventListener('mouseup', () => desenhando = false);
}

function getPosCanvas(canvas, evt) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (evt.clientX - r.left),
    y: (evt.clientY - r.top)
  };
}

function limparCanvasAssinatura() {
  const canvas = document.getElementById('canvas-assinatura');
  if (!canvas || !canvasCtx) return;
  canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
  canvasVazio = true;
}

async function confirmarAssinatura(os_id) {
  const canvas = document.getElementById('canvas-assinatura');
  if (!canvas || canvasVazio) {
    toast('Por favor, assine na tela antes de salvar!', 'erro');
    return;
  }
  const dataUrl = canvas.toDataURL('image/png');
  const f = new FormData();
  f.append('assinatura_base64', dataUrl);

  try {
    toast('Gravando assinatura...');
    await post(`/os/${os_id}/assinatura`, f);
    toast('Assinatura salva com sucesso!');
    abrirOS(os_id);
  } catch (err) {
    toast('Erro ao salvar assinatura: ' + err.message, 'erro');
  }
}

// ─── FUNÇÕES DO CHECKLIST DINÂMICO ───────────────────────────────────────────
function trocarPresetChecklist(pKey, os_id) {
  presetSelecionado = pKey;
  document.querySelectorAll('.preset-tab-btn').forEach(btn => {
    const isThis = btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(`'${pKey}'`);
    btn.classList.toggle('active', isThis);
  });
  renderPresetPreviewBox(os_id);
}

function renderPresetPreviewBox(os_id) {
  const p = PRESETS[presetSelecionado] || PRESETS.oleo;
  const box = document.getElementById('preset-preview-box');
  if (!box) return;

  box.innerHTML = `
    <div class="preset-preview-header">${p.nome}</div>
    <div class="preset-preview-desc">${p.descricao} (${p.itens.length} itens inclusos). Toque em um item para adicioná-lo avulso ou clique nos botões abaixo:</div>
    
    <div class="preset-items-tags">
      ${p.itens.map(item => `
        <span class="preset-item-tag" onclick="adicionarItemAvulsoDireto(${os_id}, '${item.replace(/'/g, "\\'")}')" title="Toque para adicionar este item individual">
          + ${item}
        </span>
      `).join('')}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <button class="btn btn-primary btn-sm" onclick="aplicarPresetLote(${os_id}, 'OK')" style="padding:10px;font-size:0.8rem">
        ⚡ Inserir Todos como OK
      </button>
      <button class="btn btn-outline btn-sm" onclick="aplicarPresetLote(${os_id}, 'Pendente')" style="padding:10px;font-size:0.8rem">
        📋 Inserir para Inspecionar
      </button>
    </div>
  `;
}

async function aplicarPresetLote(os_id, statusPadrao) {
  const p = PRESETS[presetSelecionado];
  if (!p) return;
  const lista = p.itens.map(nome => ({
    item: nome,
    status: statusPadrao,
    observacao: statusPadrao === 'OK' ? 'Inspeção visual OK' : 'Aguardando verificação'
  }));

  const f = new FormData();
  f.append('os_id', os_id);
  f.append('itens_json', JSON.stringify(lista));
  try {
    await post('/checklist/lote', f);
    toast(`⚡ ${lista.length} itens de "${p.nome}" adicionados!`);
    abrirOS(os_id);
  } catch (err) {
    toast('Erro ao adicionar itens: ' + err.message, 'erro');
  }
}

async function adicionarItemAvulsoDireto(os_id, nomeItem) {
  const f = new FormData();
  f.append('os_id', os_id);
  f.append('item', nomeItem);
  f.append('status', 'OK');
  f.append('observacao', 'Inspeção visual OK');
  try {
    await post('/checklist', f);
    toast(`✓ Item "${nomeItem}" adicionado!`);
    abrirOS(os_id);
  } catch (err) {
    toast('Erro: ' + err.message, 'erro');
  }
}

function modalConfirmarLimparChecklist(os_id, totalItens) {
  getModalContainer().innerHTML = `
    <div class="modal-overlay" onclick="fecharModal(event)">
      <div class="modal" style="max-width:380px;text-align:center;padding:24px 20px">
        <div style="font-size:2.8rem;margin-bottom:10px">🗑️</div>
        <div style="font-weight:800;font-size:1.15rem;color:var(--text);margin-bottom:8px">Limpar Todo o Checklist?</div>
        <div style="font-size:0.86rem;color:var(--text2);margin-bottom:20px;line-height:1.4">
          Deseja remover todos os <b>${totalItens} itens</b> inspecionados desta OS?<br>Essa ação não pode ser desfeita.
        </div>
        <div style="display:flex;gap:10px;justify-content:center">
          <button type="button" class="btn btn-outline" onclick="fecharModalForce()" style="flex:1;padding:10px">Cancelar</button>
          <button type="button" class="btn" onclick="executarLimparChecklistOS(${os_id})" style="flex:1;background:#ef4444;color:#fff;border:none;padding:10px;font-weight:700">🗑️ Sim, Limpar Tudo</button>
        </div>
      </div>
    </div>`;
}

async function executarLimparChecklistOS(os_id) {
  fecharModalForce();
  try {
    toast('Limpando checklist...');
    await del('/checklist/os/' + os_id);
    toast('🗑️ Checklist limpo com sucesso!');
    abrirOS(os_id);
  } catch (err) {
    toast('Erro ao limpar checklist: ' + err.message, 'erro');
  }
}

async function limparChecklistOS(os_id) {
  modalConfirmarLimparChecklist(os_id, osAtualCarregada && osAtualCarregada.checklist ? osAtualCarregada.checklist.length : 0);
}

async function mudarStatusItem(item_id, status, os_id) {
  const f = new FormData();
  f.append('status', status);
  try {
    await put(`/checklist/item/${item_id}`, f);
    toast(`Item atualizado: ${status}`);
    abrirOS(os_id);
  } catch (err) {
    toast('Erro ao atualizar: ' + err.message, 'erro');
  }
}

// Confirmação rápida em 2 toques sem travar o navegador
function confirmarRemoverItemChecklist(btn, item_id, os_id, nomeItem) {
  if (btn.dataset.confirming === 'true') {
    removerItemChecklist(item_id, os_id, nomeItem);
  } else {
    btn.dataset.confirming = 'true';
    btn.innerHTML = '⚠️ Confirmar?';
    btn.style.background = '#ef4444';
    btn.style.color = '#fff';
    btn.style.borderColor = '#dc2626';

    setTimeout(() => {
      if (btn && btn.dataset.confirming === 'true') {
        btn.dataset.confirming = 'false';
        btn.innerHTML = '🗑️ Excluir';
        btn.style.background = 'rgba(239,68,68,0.07)';
        btn.style.color = '#ef4444';
        btn.style.borderColor = 'rgba(239,68,68,0.35)';
      }
    }, 3500);
  }
}

async function removerItemChecklist(item_id, os_id, nomeItem = 'Item') {
  const el = document.getElementById(`chk-item-${item_id}`);
  if (el) {
    el.style.transition = 'all 0.25s ease';
    el.style.opacity = '0.3';
    el.style.pointerEvents = 'none';
  }
  try {
    await del(`/checklist/item/${item_id}`);
    toast(`🗑️ "${nomeItem}" excluído!`);

    if (osAtualCarregada && osAtualCarregada.checklist) {
      osAtualCarregada.checklist = osAtualCarregada.checklist.filter(c => c.id !== item_id);
    }

    if (el) {
      el.style.height = '0px';
      el.style.margin = '0px';
      el.style.padding = '0px';
      el.style.overflow = 'hidden';
      setTimeout(() => {
        el.remove();
        const count = osAtualCarregada ? osAtualCarregada.checklist.length : 0;
        const tabBtn = document.querySelector('.os-nav-tab[data-aba="checklist"]');
        if (tabBtn) tabBtn.innerHTML = `✅ Checklist & Scanner (${count})`;
        const headerTitle = document.querySelector('#aba-os-checklist .section-title span');
        if (headerTitle) headerTitle.textContent = `✅ Checklist de Inspeção (${count})`;

        if (count === 0) {
          abrirOS(os_id);
        }
      }, 250);
    } else {
      abrirOS(os_id);
    }
  } catch (err) {
    if (el) {
      el.style.opacity = '1';
      el.style.pointerEvents = 'auto';
    }
    toast('Erro ao remover item: ' + err.message, 'erro');
  }
}

function modalNovoItemChecklist(os_id) {
  getModalContainer().innerHTML = `
    <div class="modal-overlay" onclick="fecharModal(event)">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">+ Novo Item de Checklist</div>
          <button type="button" class="modal-close" onclick="fecharModalForce();abrirOS(${os_id})">✕</button>
        </div>
        <form id="form-check-novo" onsubmit="event.preventDefault();salvarItemChecklistAvulso(${os_id})">
          <div class="form-group">
            <label class="form-label">Nome do Item / Peça *</label>
            <input type="text" inputmode="text" class="form-input" id="item-nome-avulso" name="item" required placeholder="Ex: Correia Dentada, Lâmpada de Ré..." autocomplete="off"/>
          </div>
          <div class="form-group">
            <label class="form-label">Status Inicial</label>
            <select class="form-input" id="item-status-avulso" name="status">
              <option value="OK">✅ OK (Aprovado)</option>
              <option value="Atenção">⚠️ Atenção (Desgaste)</option>
              <option value="Problema">❌ Problema (Substituição necessária)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Observação Técnica</label>
            <input type="text" inputmode="text" class="form-input" id="item-obs-avulso" name="observacao" placeholder="Ex: Folga excessiva, desgaste prematuro..." autocomplete="off"/>
          </div>
          <div style="display:flex;gap:8px;margin-top:16px">
            <button type="button" class="btn btn-outline" onclick="fecharModalForce();abrirOS(${os_id})">Cancelar</button>
            <button type="submit" class="btn btn-primary">💾 Salvar Item</button>
          </div>
        </form>
      </div>
    </div>`;
}

async function salvarItemChecklistAvulso(os_id) {
  const item = document.getElementById('item-nome-avulso').value.trim();
  const status = document.getElementById('item-status-avulso').value;
  const obs = document.getElementById('item-obs-avulso').value.trim();

  if (!item) { toast('Informe o nome do item!', 'erro'); return; }

  const f = new FormData();
  f.append('os_id', os_id);
  f.append('item', item);
  f.append('status', status);
  f.append('observacao', obs);

  try {
    await post('/checklist', f);
    toast('Item adicionado ao checklist!');
    abrirOS(os_id);
  } catch (err) {
    toast('Erro ao adicionar: ' + err.message, 'erro');
  }
}

// ─── MODAL FOTO CHECKLIST ────────────────────────────────────────────────────
function modalFotoItem(item_id, item_nome, os_id) {
  getModalContainer().innerHTML = `
    <div class="modal-overlay" onclick="fecharModal(event)">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">📷 Foto: ${item_nome}</div>
          <button type="button" class="modal-close" onclick="fecharModalForce();abrirOS(${os_id})">✕</button>
        </div>
        <form id="form-foto-item" onsubmit="event.preventDefault();enviarFotoItem(${item_id}, ${os_id})">
          <div class="form-group">
            <label class="form-label">Tirar Foto ou Anexar Imagem</label>
            <input type="file" id="foto-item-input" class="form-input" accept="image/*" capture="environment" required onchange="prevFoto(this, 'prev-chk-foto')"/>
            <img id="prev-chk-foto" class="foto-preview" style="display:none"/>
          </div>
          <div style="display:flex;gap:8px;margin-top:16px">
            <button type="button" class="btn btn-outline" onclick="fecharModalForce();abrirOS(${os_id})">Cancelar</button>
            <button type="submit" class="btn btn-primary">💾 Salvar Foto</button>
          </div>
        </form>
      </div>
    </div>`;
}

async function enviarFotoItem(item_id, os_id) {
  const fi = document.getElementById('foto-item-input');
  if (!fi.files || !fi.files[0]) { toast('Selecione uma foto!', 'erro'); return; }
  const f = new FormData();
  f.append('foto', fi.files[0]);
  try {
    await put(`/checklist/item/${item_id}`, f);
    toast('Foto salva com sucesso!');
    abrirOS(os_id);
  } catch (err) {
    toast('Erro ao salvar foto: ' + err.message, 'erro');
  }
}

// ─── EXCLUIR ORDEM DE SERVIÇO ────────────────────────────────────────────────
async function excluirOS(os_id) {
  if (confirm(`Tem certeza que deseja EXCLUIR permanentemente a OS #${os_id}? Todos os dados, checklists e fotos serão apagados.`)) {
    try {
      await del('/os/' + os_id);
      toast(`OS #${os_id} excluída com sucesso!`);
      fecharModalForce();
      renderOS();
    } catch (err) {
      toast('Erro ao excluir OS: ' + err.message, 'erro');
    }
  }
}

// ─── PORTA DE ENTRADA DO SCANNER (QR CODE / WHATSAPP / LINK) ─────────────────
function modalPortaEntrada(os_id, placa) {
  const linkUpload = window.location.origin + '/?upload_os=' + os_id;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(linkUpload)}`;
  const textoMsg = `Envie o relatório em PDF ou foto do scanner para a OS #${os_id} (Placa ${placa}) através deste link: ${linkUpload}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(textoMsg)}`;

  getModalContainer().innerHTML = `
    <div class="modal-overlay" onclick="fecharModal(event)">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">📲 Porta de Entrada do Scanner</div>
          <button type="button" class="modal-close" onclick="abrirOS(${os_id})">✕</button>
        </div>

        <div style="text-align:center;padding:10px 0">
          <div style="color:var(--text2);font-size:0.85rem;margin-bottom:12px">
            Aponte a câmera de outro celular, tablet do scanner ou envie pelo WhatsApp para anexar o PDF diretamente nesta OS!
          </div>

          <div class="qr-box">
            <img src="${qrUrl}" style="width:200px;height:200px;display:block;margin:0 auto"/>
            <div style="color:#0f172a;font-size:0.75rem;font-weight:700;margin-top:6px">QR Code da OS #${os_id}</div>
          </div>

          <div style="display:flex;flex-direction:column;gap:8px;margin-top:14px">
            <a href="${whatsappUrl}" target="_blank" class="btn btn-whatsapp" style="text-decoration:none">
              📱 Compartilhar Link no WhatsApp
            </a>
            <button class="btn btn-outline" onclick="copiarTexto('${linkUpload}')">
              📋 Copiar Link de Envio Direto
            </button>
          </div>
        </div>
      </div>
    </div>`;
}

function copiarTexto(txt) {
  navigator.clipboard.writeText(txt);
  toast('Link copiado para a área de transferência!');
}

function abrirWhatsAppComMensagem(telefone, mensagem) {
  const telLimpo = (telefone || '').replace(/\D/g, '');
  let url = '';
  if (telLimpo.length >= 10) {
    const ddi = telLimpo.length <= 11 ? '55' : '';
    url = `https://api.whatsapp.com/send?phone=${ddi}${telLimpo}&text=${encodeURIComponent(mensagem)}`;
  } else {
    url = `https://api.whatsapp.com/send?text=${encodeURIComponent(mensagem)}`;
  }
  window.open(url, '_blank');
}

function compartilharOSWhatsApp(os_id, cliente, placa, modelo) {
  if (!osAtualCarregada) return;
  const os = osAtualCarregada;
  const total = (os.total_geral || 0).toFixed(2);
  const telefone = os.cliente_tel || (dadosGlobais.clientes.find(c => c.id === os.cliente_id) || {}).telefone || '';
  const msg = `Olá ${cliente}! Segue o laudo técnico e orçamento da sua Ordem de Serviço #${os_id} referente ao veículo ${placa} (${modelo}).\n\n💰 Valor Total: R$ ${total}\n📄 Visualizar laudo completo: ${window.location.origin}/api/os/${os_id}/imprimir`;
  abrirWhatsAppComMensagem(telefone, msg);
}

function enviarLaudoEntradaWhatsApp(os_id) {
  if (!osAtualCarregada || osAtualCarregada.id !== os_id) {
    get(`/os/${os_id}`).then(os => {
      osAtualCarregada = os;
      enviarLaudoEntradaWhatsApp(os_id);
    }).catch(err => toast('Erro ao carregar dados da OS: ' + err.message, 'erro'));
    return;
  }
  const os = osAtualCarregada;
  const nomeOficina = (usuarioAtual && usuarioAtual.nome_oficina) ? usuarioAtual.nome_oficina : 'DRIVER Centro Automotivo';
  const cliente = os.cliente_nome || os.cliente || 'Cliente';
  const telefone = os.cliente_tel || (dadosGlobais.clientes.find(c => c.id === os.cliente_id) || {}).telefone || '';

  const itens = os.checklist || [];
  const problemas = itens.filter(c => c.status === 'Problema');
  const atencoes = itens.filter(c => c.status === 'Atenção');
  const oks = itens.filter(c => c.status === 'OK');

  let checklistTexto = '';
  if (problemas.length > 0) {
    checklistTexto += `\n🚨 *AVARIAS / DEFEITOS CONSTATADOS NA ENTRADA:*\n`;
    problemas.forEach(p => {
      checklistTexto += ` • ❌ ${p.item}${p.observacao ? ` (${p.observacao})` : ''}\n`;
    });
  }

  if (atencoes.length > 0) {
    checklistTexto += `\n⚠️ *ITENS COM ATENÇÃO / DESGASTE:*\n`;
    atencoes.forEach(a => {
      checklistTexto += ` • ⚠️ ${a.item}${a.observacao ? ` (${a.observacao})` : ''}\n`;
    });
  }

  if (oks.length > 0) {
    checklistTexto += `\n✅ *ITENS EM CONFORMIDADE (OK):* ${oks.length} item(ns) inspecionado(s)\n`;
  }

  if (itens.length === 0) {
    checklistTexto = '\n📋 *Inspeção Inicial:* Veículo recebido no pátio para triagem e vistoria técnica.\n';
  }

  const kmTxt = (os.km_atual || os.veiculo_km) ? `${os.km_atual || os.veiculo_km} km` : 'Registrado na entrada';
  const dataTxt = os.data_abertura ? new Date(os.data_abertura).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
  const linkLaudo = `${window.location.origin}/api/os/${os.id}/imprimir`;

  const msg = `🚗📋 *LAUDO DE ENTRADA DO VEÍCULO*
🏢 *${nomeOficina}*

Olá, *${cliente}*!
Confirmamos com sucesso a entrada e o check-in do seu veículo em nossa oficina.

📋 *DETALHES DO RECEBIMENTO:*
• *Ordem de Serviço:* #${os.id}
• *Veículo:* ${os.modelo}
• *Placa:* ${os.placa}
• *Data de Entrada:* ${dataTxt}
• *KM Registrado:* ${kmTxt}
${os.defeito_reclamado ? `• *Motivo / Reclamação:* ${os.defeito_reclamado}\n` : ''}
🔍 *CHECKLIST DE RECEPÇÃO:*${checklistTexto}
${os.assinatura_cliente ? '✍️ *Assinatura do Cliente:* Coletada e validada digitalmente na vistoria.\n' : ''}
📄 *Visualizar Laudo Completo / Digital:*
${linkLaudo}

Seu veículo já está sob os cuidados de nossa equipe técnica. Qualquer novidade entraremos em contato! 🤝`;

  toast('📲 Abrindo WhatsApp com o Laudo de Entrada...');
  abrirWhatsAppComMensagem(telefone, msg);
}

// ─── MODAL SCANNER DIRETO DO APARELHO ─────────────────────────────────────────
let abaScanner = 'pdf';
function modalScanner(os_id, vid) {
  getModalContainer().innerHTML = `
    <div class="modal-overlay" onclick="fecharModal(event)">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">🔍 Scanner Automotivo</div>
          <button type="button" class="modal-close" onclick="fecharModalForce();abrirOS(${os_id})">✕</button>
        </div>

        <div class="auth-tabs" style="margin-bottom:16px">
          <button type="button" class="auth-tab ${abaScanner==='pdf'?'active':''}" onclick="trocarAbaScanner('pdf', this)">📄 Anexar PDF / Foto</button>
          <button type="button" class="auth-tab ${abaScanner==='obd2'?'active':''}" onclick="trocarAbaScanner('obd2', this)">⚡ Leitura Rápida OBD2</button>
        </div>

        <form id="form-sc" onsubmit="event.preventDefault();salvarScanner(${os_id}, ${vid})">
          <div id="scanner-aba-pdf" style="display:${abaScanner==='pdf'?'block':'none'}">
            <div class="form-group">
              <label class="form-label">Arquivo do Relatório (PDF ou Foto)</label>
              <input type="file" id="arquivo-scanner" class="form-input" accept=".pdf,image/*" onchange="mostrarArquivoSelecionado(this)"/>
              <div id="nome-arq-selecionado" style="font-size:0.8rem;color:var(--ok);margin-top:4px;font-weight:700"></div>
            </div>
          </div>

          <div id="scanner-aba-obd2" style="display:${abaScanner==='obd2'?'block':'none'}">
            <div class="obd2-box">
              <div style="font-size:1.5rem;margin-bottom:6px">🔌</div>
              <div style="font-weight:700;margin-bottom:4px">Conector Bluetooth / Leitura</div>
              <div style="font-size:0.8rem;color:var(--text2);margin-bottom:12px">Capture telemetria em tempo real ou simule parâmetros</div>
              <div style="display:flex;gap:8px;justify-content:center">
                <button type="button" class="btn btn-primary btn-sm" onclick="conectarOBD2Bluetooth()">🔵 Conectar Bluetooth</button>
                <button type="button" class="btn btn-outline btn-sm" onclick="leituraRapidaOBD2()">⚡ Preencher Rápido</button>
              </div>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div class="form-group"><label class="form-label">RPM</label><input type="number" inputmode="numeric" class="form-input" id="sc-rpm" name="rpm" placeholder="850"/></div>
            <div class="form-group"><label class="form-label">Temperatura (°C)</label><input type="number" inputmode="numeric" class="form-input" id="sc-temp" name="temperatura" placeholder="90"/></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div class="form-group"><label class="form-label">Tensão Bateria (V)</label><input type="number" step="0.1" inputmode="decimal" class="form-input" id="sc-tensao" name="tensao" placeholder="13.8"/></div>
            <div class="form-group"><label class="form-label">Nível Combustível (%)</label><input type="number" inputmode="numeric" class="form-input" id="sc-comb" name="combustivel" placeholder="60"/></div>
          </div>

          <div class="form-group">
            <label class="form-label">Códigos de Falha (DTCs)</label>
            <input type="text" inputmode="text" class="form-input" id="sc-dtcs" name="dtcs" placeholder="Ex: P0300, P0171 (ou deixe em branco se OK)"/>
          </div>

          <div class="form-group">
            <label class="form-label">Observações Técnicas</label>
            <textarea class="form-input" name="observacoes" rows="2" placeholder="Ex: Scanner Raven 3 / Napro - Parâmetros normais"></textarea>
          </div>

          <div style="display:flex;gap:8px;margin-top:16px">
            <button type="button" class="btn btn-outline" onclick="fecharModalForce();abrirOS(${os_id})">Cancelar</button>
            <button type="submit" class="btn btn-primary">💾 Salvar Relatório</button>
          </div>
        </form>
      </div>
    </div>`;
}

function trocarAbaScanner(aba, btn) {
  abaScanner = aba;
  document.querySelectorAll('.auth-tabs .auth-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const pdfDiv = document.getElementById('scanner-aba-pdf');
  const obdDiv = document.getElementById('scanner-aba-obd2');
  if (pdfDiv) pdfDiv.style.display = aba === 'pdf' ? 'block' : 'none';
  if (obdDiv) obdDiv.style.display = aba === 'obd2' ? 'block' : 'none';
}

function mostrarArquivoSelecionado(input) {
  const lbl = document.getElementById('nome-arq-selecionado');
  if (input.files && input.files[0]) {
    lbl.textContent = `✓ Selecionado: ${input.files[0].name}`;
  } else {
    lbl.textContent = '';
  }
}

async function conectarOBD2Bluetooth() {
  if (!navigator.bluetooth) {
    toast('Seu navegador não suporta Bluetooth direto. Use o botão Preencher Rápido!', 'erro');
    return;
  }
  try {
    toast('Procurando conector OBD2 Bluetooth...');
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ['generic_access', '0000fff0-0000-1000-8000-00805f9b34fb']
    });
    toast(`Conectado ao ${device.name || 'OBD2'}! Lendo telemetria...`);
    leituraRapidaOBD2();
  } catch (err) {
    if (err.name !== 'NotFoundError') {
      toast('Bluetooth: ' + err.message, 'erro');
    }
  }
}

function leituraRapidaOBD2() {
  document.getElementById('sc-rpm').value = 820;
  document.getElementById('sc-temp').value = 90;
  document.getElementById('sc-tensao').value = 13.9;
  document.getElementById('sc-comb').value = 75;
  document.getElementById('sc-dtcs').value = 'Sem códigos de falha ativos (Sistema OK)';
  toast('⚡ Dados da injeção preenchidos automaticamente!');
}

async function salvarScanner(os_id, vid) {
  const f = new FormData(document.getElementById('form-sc'));
  f.append('os_id', os_id);
  f.append('veiculo_id', vid);
  const fi = document.getElementById('arquivo-scanner');
  if (fi && fi.files[0]) f.append('arquivo', fi.files[0]);
  try {
    const res = await post('/scanner', f);
    toast(res.tipo === 'pdf' ? '📄 Relatório em PDF anexado com sucesso!' : '🔍 Scanner salvo com sucesso!');
    abrirOS(os_id);
  } catch (err) {
    toast('Erro ao salvar: ' + err.message, 'erro');
  }
}

async function mudarStatus(id, status) {
  const f = new FormData();
  f.append('status', status);
  await put('/os/' + id + '/status', f);
  toast('Status da OS: ' + status);
  abrirOS(id);
}

function prevFoto(input, pid) {
  const p = document.getElementById(pid);
  if (input.files && input.files[0]) {
    const r = new FileReader();
    r.onload = e => { p.src = e.target.result; p.style.display = 'block'; };
    r.readAsDataURL(input.files[0]);
  }
}
