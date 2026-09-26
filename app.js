const API = '/api';
let paginaAtual = 'dashboard';
let dadosGlobais = { clientes: [], veiculos: [], os: [] };
let arquivoFotoRapida = null;

document.addEventListener('DOMContentLoaded', () => { renderApp(); navegarPara('dashboard'); });

function renderApp() {
  document.getElementById('app').innerHTML = `
    <div class="header"><div><h1>DRIVER</h1><div class="subtitle">SISTEMA DE OFICINA</div></div><div id="header-action"></div></div>
    <div class="main" id="main-content"></div>
    <nav class="bottom-nav">
      <button class="nav-btn active" id="nav-dashboard" onclick="navegarPara('dashboard')"><span class="icon">🏠</span>Início</button>
      <button class="nav-btn" id="nav-fotos" onclick="navegarPara('fotos')"><span class="icon">📷</span>Fotos</button>
      <button class="nav-btn" id="nav-os" onclick="navegarPara('os')"><span class="icon">📋</span>OS</button>
      <button class="nav-btn" id="nav-clientes" onclick="navegarPara('clientes')"><span class="icon">👤</span>Clientes</button>
      <button class="nav-btn" id="nav-veiculos" onclick="navegarPara('veiculos')"><span class="icon">🚗</span>Veículos</button>
    </nav>
    <div id="modal-container"></div><div id="toast-container"></div>`;
}

function navegarPara(p) {
  paginaAtual = p;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('nav-'+p); if (btn) btn.classList.add('active');
  document.getElementById('header-action').innerHTML = '';
  ({dashboard:renderDashboard,fotos:renderFotos,os:renderOS,clientes:renderClientes,veiculos:renderVeiculos})[p]?.();
}

function toast(msg, tipo='ok') {
  const t = document.createElement('div'); t.className=`toast ${tipo==='erro'?'erro':''}`; t.textContent=msg;
  document.getElementById('toast-container').appendChild(t); setTimeout(()=>t.remove(),2800);
}
async function get(u) { return (await fetch(API+u)).json(); }
async function post(u,f) { return (await fetch(API+u,{method:'POST',body:f})).json(); }
async function put(u,f) { return (await fetch(API+u,{method:'PUT',body:f})).json(); }
function fecharModal(e) { if(e.target.classList.contains('modal-overlay')) fecharModalForce(); }
function fecharModalForce() { document.getElementById('modal-container').innerHTML=''; }
function formatarData(s) { if(!s)return'—'; const d=new Date(s); return d.toLocaleDateString('pt-BR')+' '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); }

// DASHBOARD
async function renderDashboard() {
  const m = document.getElementById('main-content');
  m.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8">Carregando...</div>';
  const d = await get('/dashboard');
  m.innerHTML = `
    <div class="section-title">🏠 Painel da Oficina</div>
    <div class="dash-grid">
      <div class="card"><div class="card-title">Clientes</div><div class="card-value">${d.total_clientes}</div></div>
      <div class="card"><div class="card-title">Veiculos</div><div class="card-value">${d.total_veiculos}</div></div>
      <div class="card"><div class="card-title">OS Abertas</div><div class="card-value" style="color:#ef4444">${d.os_abertas}</div></div>
      <div class="card"><div class="card-title">Em Andamento</div><div class="card-value" style="color:#3b82f6">${d.os_andamento}</div></div>
    </div>
    <div class="card" style="margin-bottom:16px"><div class="card-title">OS Abertas Hoje</div><div class="card-value">${d.os_hoje}</div></div>
    <div class="acoes-grid">
      <button class="acao-btn" onclick="navegarPara('fotos')"><span>📷</span>Tirar Foto</button>
      <button class="acao-btn" onclick="modalNovaOS()"><span>📋</span>Nova OS</button>
      <button class="acao-btn" onclick="navegarPara('clientes')"><span>👤</span>Clientes</button>
      <button class="acao-btn" onclick="navegarPara('veiculos')"><span>🚗</span>Veiculos</button>
    </div>
    <div class="section-title" style="font-size:0.95rem;margin-top:16px">Ultimas OS</div>
    ${d.ultimas_os.length===0?'<div class="card" style="color:#94a3b8;text-align:center">Nenhuma OS cadastrada</div>':
      d.ultimas_os.map(o=>`<div class="list-item" onclick="abrirOS(${o.id})">
        <div class="info"><div class="title">OS #${o.id} - ${o.placa} ${o.modelo}</div><div class="sub">${o.cliente} - ${formatarData(o.criado_em)}</div></div>
        <span class="badge badge-${o.status.toLowerCase().replace(' ','-')}">${o.status}</span></div>`).join('')}`;
}

// FOTOS - TELA PRINCIPAL
async function renderFotos() {
  const os_list = await get('/os');
  dadosGlobais.os = os_list;
  document.getElementById('main-content').innerHTML = `
    <div class="section-title">📷 Registrar Foto</div>
    <div class="foto-destaque" id="bloco-camera">
      <div style="font-size:4rem">📷</div>
      <div style="font-size:1.2rem;font-weight:800;margin:8px 0">Tirar Foto Agora</div>
      <div style="color:#94a3b8;font-size:0.9rem;margin-bottom:16px">Data e hora sao adicionadas automaticamente na imagem</div>
      <input type="file" id="foto-rapida" accept="image/*" capture="environment" style="display:none" onchange="previewFotoRapida(this)"/>
      <label for="foto-rapida" class="btn btn-primary" style="font-size:1.1rem;padding:16px 32px;border-radius:12px;display:inline-block">📸 ABRIR CAMERA</label>
    </div>
    <div id="preview-area" style="display:none">
      <img id="img-preview" style="width:100%;border-radius:12px;margin-bottom:12px;border:2px solid #f59e0b"/>
      <div class="form-group"><label class="form-label">Vincular a uma OS (opcional)</label>
        <select class="form-input" id="sel-os-foto">
          <option value="">-- Nenhuma OS --</option>
          ${os_list.map(o=>`<option value="${o.id}">OS #${o.id} - ${o.placa} - ${o.cliente_nome}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Tipo do Item</label>
        <select class="form-input" id="sel-tipo-foto">
          <option>Pneu Dianteiro Esquerdo</option><option>Pneu Dianteiro Direito</option>
          <option>Pneu Traseiro Esquerdo</option><option>Pneu Traseiro Direito</option>
          <option>Freio Dianteiro</option><option>Freio Traseiro</option>
          <option>Oleo do Motor</option><option>Fluido de Freio</option>
          <option>Agua do Radiador</option><option>Correia Dentada</option>
          <option>Filtro de Ar</option><option>Faróis e Lanternas</option>
          <option>Suspensao</option><option>Bateria</option>
          <option>Foto do Scanner</option><option>Foto Geral</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Status</label>
        <select class="form-input" id="sel-status-foto">
          <option value="OK">OK</option>
          <option value="Atencao">Atencao</option>
          <option value="Problema">Problema</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Observacao</label>
        <input class="form-input" id="obs-foto" placeholder="Descricao do que foi encontrado..."/>
      </div>
      <button class="btn btn-primary" style="font-size:1rem;padding:14px;margin-bottom:8px" onclick="salvarFotoRapida()">💾 SALVAR FOTO COM DATA E HORA</button>
      <button class="btn btn-outline" onclick="cancelarFoto()">Cancelar</button>
    </div>`;
}

function previewFotoRapida(input) {
  if (input.files && input.files[0]) {
    arquivoFotoRapida = input.files[0];
    const reader = new FileReader();
    reader.onload = e => {
      document.getElementById('img-preview').src = e.target.result;
      document.getElementById('preview-area').style.display = 'block';
      document.getElementById('bloco-camera').style.display = 'none';
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function cancelarFoto() {
  arquivoFotoRapida = null;
  document.getElementById('preview-area').style.display = 'none';
  document.getElementById('bloco-camera').style.display = 'block';
}

async function salvarFotoRapida() {
  if (!arquivoFotoRapida) { toast('Selecione uma foto!','erro'); return; }
  const osId = document.getElementById('sel-os-foto').value;
  const item = document.getElementById('sel-tipo-foto').value;
  const status = document.getElementById('sel-status-foto').value;
  const obs = document.getElementById('obs-foto').value;
  const form = new FormData();
  form.append('item', item); form.append('status', status); form.append('observacao', obs);
  form.append('foto', arquivoFotoRapida);
  if (osId) { form.append('os_id', osId); await post('/checklist', form); }
  else { form.append('os_id','0'); await fetch(API+'/checklist',{method:'POST',body:form}).catch(()=>{}); }
  toast('Foto salva com data e hora!'); cancelarFoto(); renderFotos();
}

// CLIENTES
async function renderClientes() {
  document.getElementById('header-action').innerHTML = `<button class="btn btn-primary btn-sm" onclick="modalNovoCliente()">+ Novo</button>`;
  const m = document.getElementById('main-content');
  const clientes = await get('/clientes'); dadosGlobais.clientes = clientes;
  m.innerHTML = `<div class="section-title">Clientes (${clientes.length})</div>
    ${clientes.length===0?`<div class="card" style="color:#94a3b8;text-align:center;padding:30px">Nenhum cliente.<br><br><button class="btn btn-primary btn-sm" onclick="modalNovoCliente()">+ Cadastrar</button></div>`:
      clientes.map(c=>`<div class="list-item" onclick="detalheCliente(${c.id})">
        <div class="info"><div class="title">${c.nome}</div><div class="sub">Tel: ${c.telefone||'--'}</div></div>
        <div class="arrow">›</div></div>`).join('')}`;
}

function modalNovoCliente(d=null) {
  document.getElementById('modal-container').innerHTML = `
    <div class="modal-overlay" onclick="fecharModal(event)"><div class="modal">
      <div class="modal-header"><div class="modal-title">${d?'Editar':'Novo'} Cliente</div><button class="modal-close" onclick="fecharModalForce()">X</button></div>
      <form id="form-cliente">
        <div class="form-group"><label class="form-label">Nome *</label><input class="form-input" name="nome" required value="${d?d.nome:''}"/></div>
        <div class="form-group"><label class="form-label">Telefone</label><input class="form-input" name="telefone" value="${d?d.telefone||'':''}"/></div>
        <div class="form-group"><label class="form-label">Email</label><input class="form-input" name="email" value="${d?d.email||'':''}"/></div>
        <div class="form-group"><label class="form-label">CPF</label><input class="form-input" name="cpf" value="${d?d.cpf||'':''}"/></div>
        <button class="btn btn-primary" type="button" onclick="salvarCliente(${d?d.id:'null'})">Salvar</button>
      </form></div></div>`;
}

async function salvarCliente(id) {
  const f = new FormData(document.getElementById('form-cliente'));
  if(id){await put('/clientes/'+id,f);}else{await post('/clientes',f);}
  toast('Cliente salvo!'); fecharModalForce(); renderClientes();
}

async function detalheCliente(id) {
  const c = await get('/clientes/'+id); const v = await get('/veiculos?cliente_id='+id);
  document.getElementById('modal-container').innerHTML = `
    <div class="modal-overlay" onclick="fecharModal(event)"><div class="modal">
      <div class="modal-header"><div class="modal-title">${c.nome}</div><button class="modal-close" onclick="fecharModalForce()">X</button></div>
      <div class="card"><div class="sub">Tel: ${c.telefone||'--'}</div><div class="sub">Email: ${c.email||'--'}</div><div class="sub">CPF: ${c.cpf||'--'}</div></div>
      <button class="btn btn-outline btn-sm" style="margin-bottom:16px" onclick="modalNovoCliente(${JSON.stringify(c).replace(/"/g,'&quot;')})">Editar</button>
      <div class="section-title" style="font-size:0.9rem">Veiculos (${v.length})</div>
      ${v.map(x=>`<div class="list-item"><div class="info"><div class="title">${x.placa} - ${x.marca} ${x.modelo}</div><div class="sub">${x.ano} - ${x.km} km</div></div></div>`).join('')}
      <button class="btn btn-primary" style="margin-top:12px" onclick="fecharModalForce();modalNovoVeiculo(${id})">+ Novo Veiculo</button>
    </div></div>`;
}

// VEICULOS
async function renderVeiculos() {
  document.getElementById('header-action').innerHTML = `<button class="btn btn-primary btn-sm" onclick="modalNovoVeiculo()">+ Novo</button>`;
  const veiculos = await get('/veiculos'); dadosGlobais.veiculos = veiculos;
  document.getElementById('main-content').innerHTML = `<div class="section-title">Veiculos (${veiculos.length})</div>
    ${veiculos.length===0?`<div class="card" style="color:#94a3b8;text-align:center;padding:30px">Nenhum veiculo.<br><br><button class="btn btn-primary btn-sm" onclick="modalNovoVeiculo()">+ Cadastrar</button></div>`:
      veiculos.map(v=>`<div class="list-item"><div class="info"><div class="title">${v.placa} - ${v.marca} ${v.modelo}</div><div class="sub">Cliente: ${v.cliente_nome} - ${v.ano} - ${v.km} km</div></div><div class="arrow">›</div></div>`).join('')}`;
}

async function modalNovoVeiculo(cli=null) {
  const clientes = dadosGlobais.clientes.length?dadosGlobais.clientes:await get('/clientes');
  dadosGlobais.clientes = clientes;
  document.getElementById('modal-container').innerHTML = `
    <div class="modal-overlay" onclick="fecharModal(event)"><div class="modal">
      <div class="modal-header"><div class="modal-title">Novo Veiculo</div><button class="modal-close" onclick="fecharModalForce()">X</button></div>
      <form id="form-veiculo">
        <div class="form-group"><label class="form-label">Cliente *</label>
          <select class="form-input" name="cliente_id" required>
            <option value="">Selecione...</option>
            ${clientes.map(c=>`<option value="${c.id}" ${c.id==cli?'selected':''}>${c.nome}</option>`).join('')}
          </select></div>
        <div class="form-group"><label class="form-label">Placa *</label><input class="form-input" name="placa" required placeholder="ABC1234" style="text-transform:uppercase"/></div>
        <div class="form-group"><label class="form-label">Marca</label><input class="form-input" name="marca" placeholder="Chevrolet"/></div>
        <div class="form-group"><label class="form-label">Modelo</label><input class="form-input" name="modelo" placeholder="Onix"/></div>
        <div class="form-group"><label class="form-label">Ano</label><input class="form-input" name="ano" type="number" placeholder="2020"/></div>
        <div class="form-group"><label class="form-label">Cor</label><input class="form-input" name="cor" placeholder="Prata"/></div>
        <div class="form-group"><label class="form-label">KM</label><input class="form-input" name="km" type="number" placeholder="0"/></div>
        <button class="btn btn-primary" type="button" onclick="salvarVeiculo()">Salvar</button>
      </form></div></div>`;
}

async function salvarVeiculo() {
  await post('/veiculos', new FormData(document.getElementById('form-veiculo')));
  toast('Veiculo cadastrado!'); fecharModalForce(); renderVeiculos();
}

// ORDENS DE SERVICO
async function renderOS() {
  document.getElementById('header-action').innerHTML = `<button class="btn btn-primary btn-sm" onclick="modalNovaOS()">+ Nova OS</button>`;
  const os = await get('/os'); dadosGlobais.os = os;
  document.getElementById('main-content').innerHTML = `<div class="section-title">Ordens de Servico (${os.length})</div>
    ${os.length===0?'<div class="card" style="color:#94a3b8;text-align:center;padding:30px">Nenhuma OS cadastrada.</div>':
      os.map(o=>`<div class="list-item" onclick="abrirOS(${o.id})">
        <div class="info"><div class="title">OS #${o.id} - ${o.placa} ${o.modelo}</div>
          <div class="sub">Cliente: ${o.cliente_nome} - Mec: ${o.mecanico||'--'}</div>
          <div class="sub">${formatarData(o.criado_em)}</div></div>
        <span class="badge badge-${o.status.toLowerCase().replace(' ','-')}">${o.status}</span></div>`).join('')}`;
}

async function modalNovaOS() {
  const clientes = await get('/clientes'); const veiculos = await get('/veiculos');
  dadosGlobais.clientes=clientes; dadosGlobais.veiculos=veiculos;
  document.getElementById('modal-container').innerHTML = `
    <div class="modal-overlay" onclick="fecharModal(event)"><div class="modal">
      <div class="modal-header"><div class="modal-title">Nova Ordem de Servico</div><button class="modal-close" onclick="fecharModalForce()">X</button></div>
      <form id="form-os">
        <div class="form-group"><label class="form-label">Cliente *</label>
          <select class="form-input" name="cliente_id" required onchange="filtrarVeiculos(this.value)">
            <option value="">Selecione o cliente...</option>
            ${clientes.map(c=>`<option value="${c.id}">${c.nome}</option>`).join('')}
          </select></div>
        <div class="form-group"><label class="form-label">Veiculo *</label>
          <select class="form-input" name="veiculo_id" id="select-veiculo" required>
            <option value="">Selecione o cliente primeiro...</option>
          </select></div>
        <div class="form-group"><label class="form-label">Mecanico</label><input class="form-input" name="mecanico" placeholder="Nome do mecanico"/></div>
        <div class="form-group"><label class="form-label">Descricao do Servico</label><textarea class="form-input" name="descricao" rows="3" placeholder="Descreva o problema..."></textarea></div>
        <button class="btn btn-primary" type="button" onclick="salvarOS()">Criar OS</button>
      </form></div></div>`;
}

function filtrarVeiculos(cid) {
  const s = document.getElementById('select-veiculo');
  const v = dadosGlobais.veiculos.filter(x=>x.cliente_id==cid);
  s.innerHTML = v.length?v.map(x=>`<option value="${x.id}">${x.placa} - ${x.marca} ${x.modelo}</option>`).join(''):'<option value="">Nenhum veiculo</option>';
}

async function salvarOS() {
  const r = await post('/os', new FormData(document.getElementById('form-os')));
  toast('OS #'+r.id+' criada!'); fecharModalForce(); abrirOS(r.id);
}

async function abrirOS(id) {
  const os = await get('/os/'+id);
  document.getElementById('modal-container').innerHTML = `
    <div class="modal-overlay" onclick="fecharModal(event)"><div class="modal">
      <div class="modal-header"><div class="modal-title">OS #${os.id}</div><button class="modal-close" onclick="fecharModalForce()">X</button></div>
      <div class="card">
        <div class="title">${os.placa} - ${os.marca} ${os.modelo} ${os.ano}</div>
        <div class="sub">Cliente: ${os.cliente_nome} - Tel: ${os.cliente_tel||''}</div>
        <div class="sub">Mecanico: ${os.mecanico||'--'} - ${formatarData(os.criado_em)}</div>
        <div style="margin-top:8px"><span class="badge badge-${os.status.toLowerCase().replace(' ','-')}">${os.status}</span></div>
        ${os.descricao?`<div style="margin-top:8px;color:#94a3b8;font-size:0.85rem">${os.descricao}</div>`:''}
      </div>
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
        <button class="btn btn-outline btn-sm" onclick="mudarStatus(${os.id},'Em andamento')">Em Andamento</button>
        <button class="btn btn-outline btn-sm" onclick="mudarStatus(${os.id},'Fechada')">Fechar OS</button>
      </div>

      <div class="section-title" style="font-size:0.95rem">Checklist com Fotos (${os.checklist.length})</div>
      <div class="foto-destaque-mini" onclick="modalChecklist(${os.id})">
        <span style="font-size:2rem">📷</span>
        <div><strong>Adicionar Foto ao Checklist</strong><div style="font-size:0.8rem;opacity:0.7">Data e hora automaticas na foto</div></div>
        <span style="font-size:1.5rem">›</span>
      </div>
      ${os.checklist.map(c=>`<div class="check-item">
        <div class="item-header"><div class="item-name">${c.item}</div>
          <span class="badge ${c.status==='OK'?'badge-fechada':c.status==='Atencao'?'badge-aberta':'badge-andamento'}">${c.status}</span></div>
        ${c.observacao?`<div style="font-size:0.8rem;color:#94a3b8">${c.observacao}</div>`:''}
        ${c.foto?`<img src="/uploads/${c.foto}" class="foto-preview"/>`:'<div style="font-size:0.75rem;color:#475569;margin-top:4px">Sem foto</div>'}
        <div style="font-size:0.72rem;color:#475569;margin-top:4px">${formatarData(c.criado_em)}</div>
      </div>`).join('')}

      <div class="section-title" style="font-size:0.95rem;margin-top:16px">Relatorio Scanner (${os.scanner.length})</div>
      <div class="foto-destaque-mini" onclick="modalScanner(${os.id},${os.veiculo_id})">
        <span style="font-size:2rem">🔍</span>
        <div><strong>Adicionar Relatorio Scanner</strong><div style="font-size:0.8rem;opacity:0.7">Foto + dados OBD2 com data/hora</div></div>
        <span style="font-size:1.5rem">›</span>
      </div>
      ${os.scanner.map(s=>`<div class="check-item">
        <div class="scanner-grid">
          <div class="scanner-field"><div class="sf-label">RPM</div><div class="sf-value">${s.rpm}</div></div>
          <div class="scanner-field"><div class="sf-label">TEMP</div><div class="sf-value">${s.temperatura}C</div></div>
          <div class="scanner-field"><div class="sf-label">TENSAO</div><div class="sf-value">${s.tensao}V</div></div>
          <div class="scanner-field"><div class="sf-label">COMB.</div><div class="sf-value">${s.combustivel}%</div></div>
        </div>
        ${s.dtcs?`<div style="margin-top:8px;font-size:0.82rem;color:#ef4444">Falhas: ${s.dtcs}</div>`:''}
        ${s.foto?`<img src="/uploads/${s.foto}" class="foto-preview"/>`:''}
      </div>`).join('')}
    </div></div>`;
}

async function mudarStatus(id,status) {
  const f=new FormData(); f.append('status',status);
  await put('/os/'+id+'/status',f); toast('Status: '+status); abrirOS(id);
}

const ITENS = ['Pneu Dianteiro Esquerdo','Pneu Dianteiro Direito','Pneu Traseiro Esquerdo','Pneu Traseiro Direito','Freio Dianteiro','Freio Traseiro','Oleo do Motor','Fluido de Freio','Agua do Radiador','Correia Dentada','Filtro de Ar','Faróis e Lanternas','Suspensao Dianteira','Suspensao Traseira','Bateria','Escapamento'];

function modalChecklist(os_id) {
  document.getElementById('modal-container').innerHTML = `
    <div class="modal-overlay" onclick="fecharModal(event)"><div class="modal">
      <div class="modal-header"><div class="modal-title">Adicionar Foto ao Checklist</div><button class="modal-close" onclick="abrirOS(${os_id})">X</button></div>
      <div style="text-align:center;margin-bottom:20px">
        <input type="file" id="foto-cl" style="display:none" accept="image/*" capture="environment" onchange="prevFoto(this,'prev-cl')"/>
        <label for="foto-cl" style="display:block;background:#f59e0b;color:#0f172a;font-weight:800;font-size:1.1rem;padding:18px;border-radius:12px;cursor:pointer">
          TIRAR FOTO AGORA<br><span style="font-size:0.75rem;font-weight:500">Data e hora sao adicionadas automaticamente</span>
        </label>
        <img id="prev-cl" style="width:100%;border-radius:10px;margin-top:12px;border:2px solid #f59e0b;display:none"/>
      </div>
      <form id="form-cl">
        <div class="form-group"><label class="form-label">Item</label>
          <select class="form-input" name="item">${ITENS.map(i=>`<option>${i}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">Status</label>
          <select class="form-input" name="status">
            <option value="OK">OK</option>
            <option value="Atencao">Atencao</option>
            <option value="Problema">Problema</option>
          </select></div>
        <div class="form-group"><label class="form-label">Observacao</label><textarea class="form-input" name="observacao" rows="2" placeholder="O que foi encontrado..."></textarea></div>
        <button class="btn btn-primary" type="button" style="padding:14px;font-size:1rem" onclick="salvarChecklist(${os_id})">SALVAR COM DATA E HORA</button>
      </form></div></div>`;
}

function prevFoto(input,pid) {
  const p=document.getElementById(pid);
  if(input.files&&input.files[0]){const r=new FileReader();r.onload=e=>{p.src=e.target.result;p.style.display='block';};r.readAsDataURL(input.files[0]);}
}

async function salvarChecklist(os_id) {
  const form = new FormData(document.getElementById('form-cl'));
  form.append('os_id',os_id);
  const fi=document.getElementById('foto-cl');
  if(fi.files[0]) form.append('foto',fi.files[0]);
  await post('/checklist',form);
  toast('Item salvo com data e hora!'); abrirOS(os_id);
}

function modalScanner(os_id,vid) {
  document.getElementById('modal-container').innerHTML = `
    <div class="modal-overlay" onclick="fecharModal(event)"><div class="modal">
      <div class="modal-header"><div class="modal-title">Relatorio Scanner</div><button class="modal-close" onclick="abrirOS(${os_id})">X</button></div>
      <div style="text-align:center;margin-bottom:20px">
        <input type="file" id="foto-sc" style="display:none" accept="image/*" capture="environment" onchange="prevFoto(this,'prev-sc')"/>
        <label for="foto-sc" style="display:block;background:#3b82f6;color:#fff;font-weight:800;font-size:1.1rem;padding:18px;border-radius:12px;cursor:pointer">
          FOTOGRAFAR TELA DO SCANNER<br><span style="font-size:0.75rem;font-weight:500">Data e hora sao adicionadas automaticamente</span>
        </label>
        <img id="prev-sc" style="width:100%;border-radius:10px;margin-top:12px;border:2px solid #3b82f6;display:none"/>
      </div>
      <form id="form-sc">
        <div class="form-group"><label class="form-label">Codigos de Falha (DTCs)</label><input class="form-input" name="dtcs" placeholder="Ex: P0300, P0420"/></div>
        <div class="scanner-grid" style="margin-bottom:14px">
          <div class="form-group"><label class="form-label">RPM</label><input class="form-input" name="rpm" type="number" placeholder="0"/></div>
          <div class="form-group"><label class="form-label">Temp (C)</label><input class="form-input" name="temperatura" type="number" placeholder="0"/></div>
          <div class="form-group"><label class="form-label">Tensao (V)</label><input class="form-input" name="tensao" type="number" step="0.1" placeholder="12.0"/></div>
          <div class="form-group"><label class="form-label">Combustivel (%)</label><input class="form-input" name="combustivel" type="number" placeholder="0"/></div>
        </div>
        <div class="form-group"><label class="form-label">Observacoes</label><textarea class="form-input" name="observacoes" rows="3" placeholder="Diagnostico do mecanico..."></textarea></div>
        <button class="btn btn-primary" style="padding:14px;font-size:1rem" type="button" onclick="salvarScanner(${os_id},${vid})">SALVAR RELATORIO</button>
      </form></div></div>`;
}

async function salvarScanner(os_id,vid) {
  const f=new FormData(document.getElementById('form-sc'));
  f.append('os_id',os_id); f.append('veiculo_id',vid);
  const fi=document.getElementById('foto-sc');
  if(fi.files[0]) f.append('foto',fi.files[0]);
  await post('/scanner',f); toast('Scanner salvo!'); abrirOS(os_id);
}

