import sys
print(">>> [DRIVER] Carregando modulo main.py...", flush=True)
from fastapi.responses import HTMLResponse, FileResponse
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import sqlite3, os, uuid, hashlib, io
from datetime import datetime

try:
    from PIL import Image, ImageDraw, ImageFont
    HAS_PIL = True
    print(">>> [DRIVER] Pillow carregado com sucesso.", flush=True)
except Exception as e:
    HAS_PIL = False
    print(f">>> [DRIVER AVISO] Pillow nao disponivel: {e}", flush=True)

app = FastAPI(title="DRIVER - Multi-Oficinas")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
DB_PATH = os.path.join(BASE_DIR, "database.db")

if os.path.isdir(os.path.join(BASE_DIR, "public")) and os.path.exists(os.path.join(BASE_DIR, "public", "index.html")):
    STATIC_DIR = os.path.join(BASE_DIR, "public")
elif os.path.exists(os.path.join(BASE_DIR, "index.html")):
    STATIC_DIR = BASE_DIR
elif os.path.exists(os.path.join(BASE_DIR, "..", "frontend", "public")):
    STATIC_DIR = os.path.join(BASE_DIR, "..", "frontend", "public")
else:
    STATIC_DIR = os.path.join(BASE_DIR, "public")

os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "checklist"), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "assinaturas"), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "scanner"), exist_ok=True)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

SALT = "driver_secure_salt_2026"

def hash_senha(senha: str) -> str:
    return hashlib.sha256((senha + SALT).encode('utf-8')).hexdigest()

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            senha_hash TEXT NOT NULL,
            nome_oficina TEXT DEFAULT 'Minha Oficina',
            telefone TEXT DEFAULT '',
            criado_em TEXT DEFAULT (datetime('now','localtime'))
        );

        CREATE TABLE IF NOT EXISTS sessoes (
            token TEXT PRIMARY KEY,
            usuario_id INTEGER NOT NULL,
            criado_em TEXT DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        );

        CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER DEFAULT 1,
            nome TEXT NOT NULL,
            telefone TEXT,
            email TEXT,
            cpf TEXT,
            criado_em TEXT DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        );

        CREATE TABLE IF NOT EXISTS veiculos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER DEFAULT 1,
            cliente_id INTEGER NOT NULL,
            placa TEXT NOT NULL,
            modelo TEXT,
            marca TEXT,
            ano INTEGER,
            cor TEXT,
            km INTEGER,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
            FOREIGN KEY (cliente_id) REFERENCES clientes(id)
        );

        CREATE TABLE IF NOT EXISTS ordens_servico (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER DEFAULT 1,
            veiculo_id INTEGER NOT NULL,
            cliente_id INTEGER NOT NULL,
            status TEXT DEFAULT 'Aberta',
            descricao TEXT,
            mecanico TEXT,
            valor REAL,
            criado_em TEXT DEFAULT (datetime('now','localtime')),
            fechado_em TEXT,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
            FOREIGN KEY (veiculo_id) REFERENCES veiculos(id),
            FOREIGN KEY (cliente_id) REFERENCES clientes(id)
        );

        
        CREATE TABLE IF NOT EXISTS os_itens_orcamento (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            os_id INTEGER NOT NULL,
            tipo TEXT NOT NULL DEFAULT 'peca',
            descricao TEXT NOT NULL,
            quantidade REAL DEFAULT 1,
            valor_unitario REAL DEFAULT 0.0,
            subtotal REAL DEFAULT 0.0,
            criado_em TEXT DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (os_id) REFERENCES ordens_servico(id)
        );

        CREATE TABLE IF NOT EXISTS checklist_itens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            os_id INTEGER NOT NULL,
            item TEXT NOT NULL,
            status TEXT DEFAULT 'OK',
            observacao TEXT,
            foto TEXT,
            criado_em TEXT DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (os_id) REFERENCES ordens_servico(id)
        );

        CREATE TABLE IF NOT EXISTS scanner_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER DEFAULT 1,
            os_id INTEGER NOT NULL,
            veiculo_id INTEGER NOT NULL,
            dtcs TEXT,
            rpm INTEGER,
            temperatura INTEGER,
            tensao REAL,
            combustivel INTEGER,
            observacoes TEXT,
            foto TEXT,
            criado_em TEXT DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
            FOREIGN KEY (os_id) REFERENCES ordens_servico(id),
            FOREIGN KEY (veiculo_id) REFERENCES veiculos(id)
        );
    """)

    # Migrações caso colunas não existam ainda
    
    # Migrações para ordens_servico (orçamento, km, revisão, assinatura)
    colunas_os = [
        ("km_atual", "INTEGER DEFAULT 0"),
        ("km_proxima_troca", "INTEGER DEFAULT 0"),
        ("data_proxima_troca", "TEXT DEFAULT ''"),
        ("forma_pagamento", "TEXT DEFAULT ''"),
        ("assinatura_cliente", "TEXT DEFAULT ''"),
        ("valor_total", "REAL DEFAULT 0.0")
    ]
    for col, ctipo in colunas_os:
        try:
            conn.execute(f"ALTER TABLE ordens_servico ADD COLUMN {col} {ctipo}")
        except:
            pass

    for tab in ['clientes', 'veiculos', 'ordens_servico', 'scanner_reports']:
        try:
            conn.execute(f"ALTER TABLE {tab} ADD COLUMN usuario_id INTEGER DEFAULT 1")
        except:
            pass

    # Usuário padrão inicial (Mateus) caso tabela de usuários esteja vazia
    usr = conn.execute("SELECT id FROM usuarios LIMIT 1").fetchone()
    if not usr:
        default_pwd = hash_senha("123456")
        conn.execute(
            "INSERT INTO usuarios (nome, email, senha_hash, nome_oficina) VALUES (?,?,?,?)",
            ("Mateus Arlen", "mateusarlen98@gmail.com", default_pwd, "Oficina BORDCAN")
        )
        conn.commit()

    conn.commit()
    conn.close()

@app.on_event("startup")
def startup_event():
    print(">>> [DRIVER STARTUP] Executando inicializacao do banco de dados...", flush=True)
    try:
        init_db()
        print(">>> [DRIVER STARTUP] Banco de dados pronto para uso!", flush=True)
    except Exception as e:
        print(f">>> [DRIVER ERRO CRITICO AO INICIAR BANCO]: {e}", flush=True)
        import traceback
        traceback.print_exc()

@app.get("/api/health")
@app.get("/healthz")
def healthcheck():
    return {"status": "ok", "app": "DRIVER", "version": "4.6"}

# ─── AUTENTICAÇÃO ─────────────────────────────────────────────────────────────
def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(401, "Token de autenticação não fornecido")
    token = authorization.replace("Bearer ", "").strip()
    conn = get_db()
    sess = conn.execute("""
        SELECT u.id, u.nome, u.email, u.nome_oficina, u.telefone
        FROM sessoes s
        JOIN usuarios u ON u.id = s.usuario_id
        WHERE s.token = ?
    """, (token,)).fetchone()
    conn.close()
    if not sess:
        raise HTTPException(401, "Sessão inválida ou expirada. Faça login novamente.")
    return dict(sess)

@app.post("/api/auth/cadastro")
def cadastrar(
    nome: str = Form(...),
    email: str = Form(...),
    senha: str = Form(...),
    nome_oficina: str = Form("Minha Oficina")
):
    email = email.strip().lower()
    if len(senha) < 4:
        raise HTTPException(400, "A senha deve ter pelo menos 4 caracteres")
    conn = get_db()
    existe = conn.execute("SELECT id FROM usuarios WHERE email=?", (email,)).fetchone()
    if existe:
        conn.close()
        raise HTTPException(400, "Este e-mail já está cadastrado. Faça login!")
    
    senha_h = hash_senha(senha)
    cur = conn.execute(
        "INSERT INTO usuarios (nome, email, senha_hash, nome_oficina) VALUES (?,?,?,?)",
        (nome.strip(), email, senha_h, nome_oficina.strip())
    )
    user_id = cur.lastrowid
    token = uuid.uuid4().hex
    conn.execute("INSERT INTO sessoes (token, usuario_id) VALUES (?,?)", (token, user_id))
    conn.commit()
    conn.close()
    return {
        "token": token,
        "usuario": {"id": user_id, "nome": nome, "email": email, "nome_oficina": nome_oficina}
    }

@app.post("/api/auth/login")
def login(email: str = Form(...), senha: str = Form(...)):
    email = email.strip().lower()
    conn = get_db()
    usr = conn.execute("SELECT * FROM usuarios WHERE email=?", (email,)).fetchone()
    if not usr or usr["senha_hash"] != hash_senha(senha):
        conn.close()
        raise HTTPException(401, "E-mail ou senha incorretos")
    
    token = uuid.uuid4().hex
    conn.execute("INSERT INTO sessoes (token, usuario_id) VALUES (?,?)", (token, usr["id"]))
    conn.commit()
    user_dict = {"id": usr["id"], "nome": usr["nome"], "email": usr["email"], "nome_oficina": usr["nome_oficina"]}
    conn.close()
    return {"token": token, "usuario": user_dict}

@app.get("/api/auth/me")
def me(user: dict = Depends(get_current_user)):
    return user

@app.post("/api/auth/logout")
def logout(authorization: str = Header(None)):
    if authorization:
        token = authorization.replace("Bearer ", "").strip()
        conn = get_db()
        conn.execute("DELETE FROM sessoes WHERE token=?", (token,))
        conn.commit()
        conn.close()
    return {"mensagem": "Desconectado"}

@app.put("/api/auth/perfil")
def atualizar_perfil(
    nome_oficina: str = Form(...),
    nome: str = Form(""),
    telefone: str = Form(""),
    user: dict = Depends(get_current_user)
):
    conn = get_db()
    nome_oficina = nome_oficina.strip()
    if not nome_oficina:
        conn.close()
        raise HTTPException(400, "O nome da oficina não pode ficar em branco")
    
    nome = nome.strip() or user["nome"]
    conn.execute(
        "UPDATE usuarios SET nome_oficina=?, nome=?, telefone=? WHERE id=?",
        (nome_oficina, nome, telefone.strip(), user["id"])
    )
    conn.commit()
    conn.close()
    
    usuario_atualizado = {
        "id": user["id"],
        "nome": nome,
        "email": user["email"],
        "nome_oficina": nome_oficina,
        "telefone": telefone.strip()
    }
    return {"mensagem": "Dados da oficina atualizados com sucesso!", "usuario": usuario_atualizado}

# ─── UTILITÁRIO: CARIMBO DATA/HORA NA FOTO ───────────────────────────────────
def carimbar_foto(image_bytes: bytes, nome_oficina: str = "DRIVER") -> bytes:
    if not HAS_PIL:
        return image_bytes
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        draw = ImageDraw.Draw(img)
        agora = datetime.now().strftime("%d/%m/%Y  %H:%M hs")
        texto = f"  {agora}   | {nome_oficina}  "
        w, h = img.size
        font_size = max(22, h // 28)
        try: font = ImageFont.truetype("arial.ttf", font_size)
        except: font = ImageFont.load_default()
        bbox = draw.textbbox((0, 0), texto, font=font)
        tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
        margin = 12; x = margin; y = h - th - margin * 2
        overlay = Image.new("RGBA", img.size, (0,0,0,0))
        draw_overlay = ImageDraw.Draw(overlay)
        draw_overlay.rectangle([x-8, y-8, x+tw+12, y+th+12], fill=(0,0,0,170))
        img = img.convert("RGBA")
        img = Image.alpha_composite(img, overlay).convert("RGB")
        draw = ImageDraw.Draw(img)
        draw.text((x, y), texto, fill=(255,255,255), font=font)
        output = io.BytesIO()
        img.save(output, format="JPEG", quality=92)
        return output.getvalue()
    except Exception:
        return image_bytes

# ─── DASHBOARD (ISOLADO POR USUÁRIO) ─────────────────────────────────────────
@app.get("/api/dashboard")
def dashboard(user: dict = Depends(get_current_user)):
    uid = user["id"]
    conn = get_db()
    d = {
        "usuario": user,
        "total_clientes": conn.execute("SELECT COUNT(*) FROM clientes WHERE usuario_id=?", (uid,)).fetchone()[0],
        "total_veiculos": conn.execute("SELECT COUNT(*) FROM veiculos WHERE usuario_id=?", (uid,)).fetchone()[0],
        "os_abertas": conn.execute("SELECT COUNT(*) FROM ordens_servico WHERE usuario_id=? AND status='Aberta'", (uid,)).fetchone()[0],
        "os_andamento": conn.execute("SELECT COUNT(*) FROM ordens_servico WHERE usuario_id=? AND status='Em andamento'", (uid,)).fetchone()[0],
        "os_hoje": conn.execute("SELECT COUNT(*) FROM ordens_servico WHERE usuario_id=? AND DATE(criado_em)=DATE('now','localtime')", (uid,)).fetchone()[0],
        "ultimas_os": [dict(r) for r in conn.execute("""
            SELECT o.id, o.status, o.criado_em, c.nome as cliente, v.placa, v.modelo
            FROM ordens_servico o
            JOIN clientes c ON c.id=o.cliente_id
            JOIN veiculos v ON v.id=o.veiculo_id
            WHERE o.usuario_id=?
            ORDER BY o.criado_em DESC LIMIT 5
        """, (uid,)).fetchall()]
    }
    conn.close()
    return d

# ─── CLIENTES (ISOLADO) ───────────────────────────────────────────────────────
@app.get("/api/clientes")
def listar_clientes(user: dict = Depends(get_current_user)):
    conn = get_db()
    rows = conn.execute("SELECT * FROM clientes WHERE usuario_id=? ORDER BY nome", (user["id"],)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/clientes")
def criar_cliente(
    nome: str = Form(...),
    telefone: str = Form(""),
    email: str = Form(""),
    cpf: str = Form(""),
    user: dict = Depends(get_current_user)
):
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO clientes (usuario_id, nome, telefone, email, cpf) VALUES (?,?,?,?,?)",
        (user["id"], nome, telefone, email, cpf)
    )
    conn.commit()
    id_novo = cur.lastrowid
    conn.close()
    return {"id": id_novo, "mensagem": "Cliente criado"}

@app.get("/api/clientes/{id}")
def buscar_cliente(id: int, user: dict = Depends(get_current_user)):
    conn = get_db()
    row = conn.execute("SELECT * FROM clientes WHERE id=? AND usuario_id=?", (id, user["id"])).fetchone()
    conn.close()
    if not row: raise HTTPException(404, "Cliente não encontrado")
    return dict(row)

@app.put("/api/clientes/{id}")
def atualizar_cliente(
    id: int,
    nome: str = Form(...),
    telefone: str = Form(""),
    email: str = Form(""),
    cpf: str = Form(""),
    user: dict = Depends(get_current_user)
):
    conn = get_db()
    conn.execute(
        "UPDATE clientes SET nome=?, telefone=?, email=?, cpf=? WHERE id=? AND usuario_id=?",
        (nome, telefone, email, cpf, id, user["id"])
    )
    conn.commit()
    conn.close()
    return {"mensagem": "ok"}

@app.delete("/api/clientes/{id}")
def deletar_cliente(id: int, user: dict = Depends(get_current_user)):
    conn = get_db()
    uid = user["id"]
    cli = conn.execute("SELECT id, nome FROM clientes WHERE id=? AND usuario_id=?", (id, uid)).fetchone()
    if not cli:
        conn.close()
        raise HTTPException(404, "Cliente não encontrado")
    
    os_ids = [r["id"] for r in conn.execute("SELECT id FROM ordens_servico WHERE cliente_id=? AND usuario_id=?", (id, uid)).fetchall()]
    for os_id in os_ids:
        conn.execute("DELETE FROM checklist_itens WHERE os_id=?", (os_id,))
        conn.execute("DELETE FROM os_itens_orcamento WHERE os_id=?", (os_id,))
        conn.execute("DELETE FROM scanner_reports WHERE os_id=?", (os_id,))
    
    conn.execute("DELETE FROM ordens_servico WHERE cliente_id=? AND usuario_id=?", (id, uid))
    conn.execute("DELETE FROM veiculos WHERE cliente_id=? AND usuario_id=?", (id, uid))
    conn.execute("DELETE FROM clientes WHERE id=? AND usuario_id=?", (id, uid))
    conn.commit()
    conn.close()
    return {"mensagem": f"Cliente {cli['nome']} e seus dados foram excluídos"}

# ─── VEÍCULOS (ISOLADO) ───────────────────────────────────────────────────────
@app.get("/api/veiculos")
def listar_veiculos(cliente_id: int = None, user: dict = Depends(get_current_user)):
    conn = get_db()
    uid = user["id"]
    if cliente_id:
        rows = conn.execute("""
            SELECT v.*, c.nome as cliente_nome
            FROM veiculos v JOIN clientes c ON c.id=v.cliente_id
            WHERE v.usuario_id=? AND v.cliente_id=?
        """, (uid, cliente_id)).fetchall()
    else:
        rows = conn.execute("""
            SELECT v.*, c.nome as cliente_nome
            FROM veiculos v JOIN clientes c ON c.id=v.cliente_id
            WHERE v.usuario_id=?
            ORDER BY v.placa
        """, (uid,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/veiculos")
def criar_veiculo(
    cliente_id: int = Form(...),
    placa: str = Form(...),
    modelo: str = Form(""),
    marca: str = Form(""),
    ano: int = Form(0),
    cor: str = Form(""),
    km: int = Form(0),
    user: dict = Depends(get_current_user)
):
    conn = get_db()
    cur = conn.execute("""
        INSERT INTO veiculos (usuario_id, cliente_id, placa, modelo, marca, ano, cor, km)
        VALUES (?,?,?,?,?,?,?,?)
    """, (user["id"], cliente_id, placa.upper(), modelo, marca, ano, cor, km))
    conn.commit()
    conn.close()
    return {"id": cur.lastrowid}

@app.put("/api/veiculos/{id}")
def atualizar_veiculo(
    id: int,
    placa: str = Form(...),
    modelo: str = Form(""),
    marca: str = Form(""),
    ano: int = Form(0),
    cor: str = Form(""),
    km: int = Form(0),
    user: dict = Depends(get_current_user)
):
    conn = get_db()
    conn.execute("""
        UPDATE veiculos SET placa=?, modelo=?, marca=?, ano=?, cor=?, km=?
        WHERE id=? AND usuario_id=?
    """, (placa.upper(), modelo, marca, ano, cor, km, id, user["id"]))
    conn.commit()
    conn.close()
    return {"mensagem": "ok"}

@app.delete("/api/veiculos/{id}")
def deletar_veiculo(id: int, user: dict = Depends(get_current_user)):
    conn = get_db()
    uid = user["id"]
    veic = conn.execute("SELECT id, placa FROM veiculos WHERE id=? AND usuario_id=?", (id, uid)).fetchone()
    if not veic:
        conn.close()
        raise HTTPException(404, "Veículo não encontrado")
    
    os_ids = [r["id"] for r in conn.execute("SELECT id FROM ordens_servico WHERE veiculo_id=? AND usuario_id=?", (id, uid)).fetchall()]
    for os_id in os_ids:
        conn.execute("DELETE FROM checklist_itens WHERE os_id=?", (os_id,))
        conn.execute("DELETE FROM os_itens_orcamento WHERE os_id=?", (os_id,))
        conn.execute("DELETE FROM scanner_reports WHERE os_id=?", (os_id,))
    
    conn.execute("DELETE FROM ordens_servico WHERE veiculo_id=? AND usuario_id=?", (id, uid))
    conn.execute("DELETE FROM scanner_reports WHERE veiculo_id=? AND usuario_id=?", (id, uid))
    conn.execute("DELETE FROM veiculos WHERE id=? AND usuario_id=?", (id, uid))
    conn.commit()
    conn.close()
    return {"mensagem": f"Veículo {veic['placa']} excluído com sucesso"}

# ─── ORDENS DE SERVIÇO (ISOLADO) ──────────────────────────────────────────────
@app.get("/api/os")
def listar_os(status: str = None, user: dict = Depends(get_current_user)):
    conn = get_db()
    uid = user["id"]
    q = f"""
        SELECT o.*, c.nome as cliente_nome, v.placa, v.modelo
        FROM ordens_servico o
        JOIN clientes c ON c.id=o.cliente_id
        JOIN veiculos v ON v.id=o.veiculo_id
        WHERE o.usuario_id=? {'AND o.status=?' if status else ''}
        ORDER BY o.criado_em DESC
    """
    rows = conn.execute(q, (uid, status) if status else (uid,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/os")
def criar_os(
    veiculo_id: int = Form(...),
    cliente_id: int = Form(...),
    descricao: str = Form(""),
    mecanico: str = Form(""),
    user: dict = Depends(get_current_user)
):
    conn = get_db()
    cur = conn.execute("""
        INSERT INTO ordens_servico (usuario_id, veiculo_id, cliente_id, descricao, mecanico)
        VALUES (?,?,?,?,?)
    """, (user["id"], veiculo_id, cliente_id, descricao, mecanico))
    conn.commit()
    conn.close()
    return {"id": cur.lastrowid}

@app.get("/api/os/{id}")
def buscar_os(id: int, user: dict = Depends(get_current_user)):
    conn = get_db()
    uid = user["id"]
    os_row = conn.execute("""
        SELECT o.*, c.nome as cliente_nome, c.telefone as cliente_tel,
               v.placa, v.modelo, v.marca, v.ano, v.km
        FROM ordens_servico o
        JOIN clientes c ON c.id=o.cliente_id
        JOIN veiculos v ON v.id=o.veiculo_id
        WHERE o.id=? AND o.usuario_id=?
    """, (id, uid)).fetchone()
    if not os_row:
        conn.close()
        raise HTTPException(404, "OS não encontrada")
    checklist = conn.execute("SELECT * FROM checklist_itens WHERE os_id=?", (id,)).fetchall()
    scanner = conn.execute("SELECT * FROM scanner_reports WHERE os_id=? AND usuario_id=?", (id, uid)).fetchall()
    orcamento = conn.execute("SELECT * FROM os_itens_orcamento WHERE os_id=? ORDER BY id", (id,)).fetchall()
    conn.close()
    
    orc_lista = [dict(o) for o in orcamento]
    tot_pecas = sum(r["subtotal"] for r in orc_lista if r["tipo"] == "peca")
    tot_servicos = sum(r["subtotal"] for r in orc_lista if r["tipo"] == "servico")
    tot_geral = tot_pecas + tot_servicos

    return {
        **dict(os_row),
        "checklist": [dict(c) for c in checklist],
        "scanner": [dict(s) for s in scanner],
        "orcamento": orc_lista,
        "total_pecas": round(tot_pecas, 2),
        "total_servicos": round(tot_servicos, 2),
        "total_geral": round(tot_geral, 2)
    }


@app.delete("/api/os/{id}")
def deletar_os(id: int, user: dict = Depends(get_current_user)):
    conn = get_db()
    # Verifica se pertence ao usuario
    os_row = conn.execute("SELECT id FROM ordens_servico WHERE id=? AND usuario_id=?", (id, user["id"])).fetchone()
    if not os_row:
        conn.close()
        raise HTTPException(404, "OS não encontrada ou não pertence à sua oficina")
    
    conn.execute("DELETE FROM checklist_itens WHERE os_id=?", (id,))
    conn.execute("DELETE FROM scanner_reports WHERE os_id=? AND usuario_id=?", (id, user["id"]))
    conn.execute("DELETE FROM ordens_servico WHERE id=? AND usuario_id=?", (id, user["id"]))
    conn.commit()
    conn.close()
    return {"mensagem": f"OS #{id} excluída com sucesso"}

# ─── PORTA DE ENTRADA RÁPIDA: UPLOAD DE PDF VIA QR CODE / WHATSAPP ────────────
@app.post("/api/scanner/upload-rapido/{os_id}")
async def upload_rapido_scanner(
    os_id: int,
    observacoes: str = Form("Enviado via link rápido/WhatsApp"),
    arquivo: UploadFile = File(...)
):
    conn = get_db()
    os_row = conn.execute("SELECT id, veiculo_id, usuario_id FROM ordens_servico WHERE id=?", (os_id,)).fetchone()
    if not os_row:
        conn.close()
        raise HTTPException(404, "OS não encontrada")
    
    usuario = conn.execute("SELECT nome_oficina FROM usuarios WHERE id=?", (os_row["usuario_id"],)).fetchone()
    nome_oficina = usuario["nome_oficina"] if usuario else "DRIVER"
    
    arquivo_nome = arquivo.filename
    conteudo = await arquivo.read()
    tipo_arquivo = "pdf" if arquivo_nome.lower().endswith(".pdf") else "imagem"
    
    if tipo_arquivo == "pdf":
        nome_arquivo = f"{uuid.uuid4().hex}.pdf"
        with open(os.path.join(UPLOAD_DIR, "scanner", nome_arquivo), "wb") as f:
            f.write(conteudo)
    else:
        conteudo = carimbar_foto(conteudo, nome_oficina)
        nome_arquivo = f"{uuid.uuid4().hex}.jpg"
        with open(os.path.join(UPLOAD_DIR, "scanner", nome_arquivo), "wb") as f:
            f.write(conteudo)
            
    caminho = f"scanner/{nome_arquivo}"
    
    cur = conn.execute("""
        INSERT INTO scanner_reports (usuario_id, os_id, veiculo_id, dtcs, rpm, temperatura, tensao, combustivel, observacoes, foto, arquivo_nome, tipo_arquivo)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    """, (os_row["usuario_id"], os_id, os_row["veiculo_id"], "Relatório Anexado via Link", 0, 0, 0, 0, observacoes, caminho, arquivo_nome, tipo_arquivo))
    conn.commit()
    conn.close()
    return {"mensagem": "Relatório anexado à OS com sucesso!", "tipo": tipo_arquivo, "arquivo": caminho}

@app.put("/api/os/{id}/status")
def status_os(id: int, status: str = Form(...), user: dict = Depends(get_current_user)):
    conn = get_db()
    fechado = datetime.now().strftime("%Y-%m-%d %H:%M:%S") if status == "Fechada" else None
    conn.execute(
        "UPDATE ordens_servico SET status=?, fechado_em=? WHERE id=? AND usuario_id=?",
        (status, fechado, id, user["id"])
    )
    conn.commit()
    conn.close()
    return {"mensagem": "ok"}

# ─── CHECKLIST COM FOTO & MODELOS RÁPIDOS ────────────────────────────────────
@app.post("/api/checklist")
async def add_checklist(
    os_id: int = Form(...),
    item: str = Form(...),
    status: str = Form("OK"),
    observacao: str = Form(""),
    foto: UploadFile = File(None),
    user: dict = Depends(get_current_user)
):
    foto_path = None
    if foto and foto.filename:
        conteudo = carimbar_foto(await foto.read(), user.get("nome_oficina", "DRIVER"))
        nome = f"{uuid.uuid4().hex}.jpg"
        with open(os.path.join(UPLOAD_DIR, "checklist", nome), "wb") as f:
            f.write(conteudo)
        foto_path = f"checklist/{nome}"
    conn = get_db()
    conn.execute("""
        INSERT INTO checklist_itens (os_id, item, status, observacao, foto)
        VALUES (?,?,?,?,?)
    """, (os_id, item, status, observacao, foto_path))
    conn.commit()
    conn.close()
    return {"mensagem": "ok", "foto": foto_path}

@app.post("/api/checklist/lote")
def add_checklist_lote(
    os_id: int = Form(...),
    itens_json: str = Form(...),
    user: dict = Depends(get_current_user)
):
    import json
    itens = json.loads(itens_json)
    conn = get_db()
    os_row = conn.execute("SELECT id FROM ordens_servico WHERE id=? AND usuario_id=?", (os_id, user["id"])).fetchone()
    if not os_row:
        conn.close()
        raise HTTPException(404, "OS não encontrada")
    
    for it in itens:
        nome_item = it.get("item", "")
        status = it.get("status", "OK")
        obs = it.get("observacao", "")
        conn.execute("""
            INSERT INTO checklist_itens (os_id, item, status, observacao, foto)
            VALUES (?,?,?,?,?)
        """, (os_id, nome_item, status, obs, None))
    conn.commit()
    conn.close()
    return {"mensagem": f"{len(itens)} itens salvos com sucesso!"}

@app.put("/api/checklist/item/{id}")
async def update_checklist_item(
    id: int,
    status: str = Form(...),
    observacao: str = Form(""),
    foto: UploadFile = File(None),
    user: dict = Depends(get_current_user)
):
    conn = get_db()
    foto_path = None
    if foto and foto.filename:
        conteudo = carimbar_foto(await foto.read(), user.get("nome_oficina", "DRIVER"))
        nome = f"{uuid.uuid4().hex}.jpg"
        with open(os.path.join(UPLOAD_DIR, "checklist", nome), "wb") as f:
            f.write(conteudo)
        foto_path = f"checklist/{nome}"
        conn.execute("UPDATE checklist_itens SET status=?, observacao=?, foto=? WHERE id=?", (status, observacao, foto_path, id))
    else:
        conn.execute("UPDATE checklist_itens SET status=?, observacao=? WHERE id=?", (status, observacao, id))
    conn.commit()
    conn.close()
    return {"mensagem": "Item atualizado"}

@app.delete("/api/checklist/item/{id}")
def delete_checklist_item(id: int, user: dict = Depends(get_current_user)):
    conn = get_db()
    conn.execute("DELETE FROM checklist_itens WHERE id=?", (id,))
    conn.commit()
    conn.close()
    return {"mensagem": "Item removido"}

@app.delete("/api/checklist/os/{os_id}")
def delete_all_checklist_os(os_id: int, user: dict = Depends(get_current_user)):
    conn = get_db()
    os_row = conn.execute("SELECT id FROM ordens_servico WHERE id=? AND usuario_id=?", (os_id, user["id"])).fetchone()
    if not os_row:
        conn.close()
        raise HTTPException(404, "OS não encontrada")
    conn.execute("DELETE FROM checklist_itens WHERE os_id=?", (os_id,))
    conn.commit()
    conn.close()
    return {"mensagem": "Checklist limpo com sucesso"}

@app.get("/api/checklist/{os_id}")
def get_checklist(os_id: int, user: dict = Depends(get_current_user)):
    conn = get_db()
    rows = conn.execute("SELECT * FROM checklist_itens WHERE os_id=? ORDER BY id", (os_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

# ─── SCANNER UNIFICADO (PDF / FOTO / OBD2) ───────────────────────────────────
@app.post("/api/scanner")
async def add_scanner(
    os_id: int = Form(...),
    veiculo_id: int = Form(...),
    dtcs: str = Form(""),
    rpm: int = Form(0),
    temperatura: int = Form(0),
    tensao: float = Form(0.0),
    combustivel: int = Form(0),
    observacoes: str = Form(""),
    arquivo: UploadFile = File(None),
    user: dict = Depends(get_current_user)
):
    arquivo_path = None
    arquivo_nome = ""
    tipo_arquivo = "nenhum"
    if arquivo and arquivo.filename:
        arquivo_nome = arquivo.filename
        conteudo = await arquivo.read()
        if arquivo.filename.lower().endswith(".pdf"):
            tipo_arquivo = "pdf"
            nome = f"{uuid.uuid4().hex}.pdf"
            with open(os.path.join(UPLOAD_DIR, "scanner", nome), "wb") as f:
                f.write(conteudo)
            arquivo_path = f"scanner/{nome}"
        else:
            tipo_arquivo = "imagem"
            conteudo = carimbar_foto(conteudo, user.get("nome_oficina", "DRIVER"))
            nome = f"{uuid.uuid4().hex}.jpg"
            with open(os.path.join(UPLOAD_DIR, "scanner", nome), "wb") as f:
                f.write(conteudo)
            arquivo_path = f"scanner/{nome}"

    conn = get_db()
    cur = conn.execute("""
        INSERT INTO scanner_reports (usuario_id, os_id, veiculo_id, dtcs, rpm, temperatura, tensao, combustivel, observacoes, foto, arquivo_nome, tipo_arquivo)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    """, (user["id"], os_id, veiculo_id, dtcs, rpm, temperatura, tensao, combustivel, observacoes, arquivo_path, arquivo_nome, tipo_arquivo))
    conn.commit()
    conn.close()
    return {"id": cur.lastrowid, "tipo": tipo_arquivo, "arquivo": arquivo_path}

@app.get("/api/scanner/{veiculo_id}")
def historico_scanner(veiculo_id: int, user: dict = Depends(get_current_user)):
    conn = get_db()
    rows = conn.execute("""
        SELECT * FROM scanner_reports
        WHERE veiculo_id=? AND usuario_id=?
        ORDER BY criado_em DESC
    """, (veiculo_id, user["id"])).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ─── ORÇAMENTO (PEÇAS E MÃO DE OBRA) ─────────────────────────────────────────
@app.post("/api/os/{id}/orcamento")
def add_item_orcamento(
    id: int,
    tipo: str = Form("peca"),
    descricao: str = Form(...),
    quantidade: float = Form(1.0),
    valor_unitario: float = Form(0.0),
    user: dict = Depends(get_current_user)
):
    conn = get_db()
    subtotal = round(quantidade * valor_unitario, 2)
    cur = conn.execute("""
        INSERT INTO os_itens_orcamento (os_id, tipo, descricao, quantidade, valor_unitario, subtotal)
        VALUES (?,?,?,?,?,?)
    """, (id, tipo, descricao, quantidade, valor_unitario, subtotal))
    
    # Recalcula e atualiza o total da OS
    tot = conn.execute("SELECT SUM(subtotal) FROM os_itens_orcamento WHERE os_id=?", (id,)).fetchone()[0] or 0.0
    conn.execute("UPDATE ordens_servico SET valor_total=?, valor=? WHERE id=?", (tot, tot, id))
    conn.commit()
    conn.close()
    return {"id": cur.lastrowid, "subtotal": subtotal, "valor_total": tot}

@app.delete("/api/os/orcamento/{item_id}")
def delete_item_orcamento(item_id: int, user: dict = Depends(get_current_user)):
    conn = get_db()
    row = conn.execute("SELECT os_id FROM os_itens_orcamento WHERE id=?", (item_id,)).fetchone()
    if row:
        os_id = row["os_id"]
        conn.execute("DELETE FROM os_itens_orcamento WHERE id=?", (item_id,))
        tot = conn.execute("SELECT SUM(subtotal) FROM os_itens_orcamento WHERE os_id=?", (os_id,)).fetchone()[0] or 0.0
        conn.execute("UPDATE ordens_servico SET valor_total=?, valor=? WHERE id=?", (tot, tot, os_id))
        conn.commit()
    conn.close()
    return {"mensagem": "Item removido"}

# ─── ASSINATURA DIGITAL TOUCH DO CLIENTE ─────────────────────────────────────
@app.post("/api/os/{id}/assinatura")
def salvar_assinatura(
    id: int,
    assinatura_base64: str = Form(...),
    user: dict = Depends(get_current_user)
):
    import base64, uuid
    conn = get_db()
    
    if "," in assinatura_base64:
        header, encoded = assinatura_base64.split(",", 1)
    else:
        encoded = assinatura_base64
        
    img_data = base64.b64decode(encoded)
    nome_arq = f"assinatura_{id}_{uuid.uuid4().hex[:8]}.png"
    caminho_completo = os.path.join(UPLOAD_DIR, "assinaturas", nome_arq)
    with open(caminho_completo, "wb") as f:
        f.write(img_data)
        
    rel_path = f"assinaturas/{nome_arq}"
    conn.execute("UPDATE ordens_servico SET assinatura_cliente=? WHERE id=? AND usuario_id=?", (rel_path, id, user["id"]))
    conn.commit()
    conn.close()
    return {"mensagem": "Assinatura salva com sucesso!", "caminho": rel_path}

# ─── CONTROLE DE REVISÃO / KM / FORMA DE PAGAMENTO ───────────────────────────
@app.put("/api/os/{id}/revisao")
def atualizar_revisao_os(
    id: int,
    km_atual: int = Form(0),
    km_proxima_troca: int = Form(0),
    data_proxima_troca: str = Form(""),
    forma_pagamento: str = Form(""),
    user: dict = Depends(get_current_user)
):
    conn = get_db()
    conn.execute("""
        UPDATE ordens_servico 
        SET km_atual=?, km_proxima_troca=?, data_proxima_troca=?, forma_pagamento=?
        WHERE id=? AND usuario_id=?
    """, (km_atual, km_proxima_troca, data_proxima_troca, forma_pagamento, id, user["id"]))
    
    if km_atual > 0:
        row = conn.execute("SELECT veiculo_id FROM ordens_servico WHERE id=?", (id,)).fetchone()
        if row and row["veiculo_id"]:
            conn.execute("UPDATE veiculos SET km=? WHERE id=?", (km_atual, row["veiculo_id"]))
            
    conn.commit()
    conn.close()
    return {"mensagem": "Dados de revisão atualizados!"}

# ─── PÁGINA PROFISSIONAL DE IMPRESSÃO / PDF A4 ───────────────────────────────
@app.get("/api/os/{id}/imprimir", response_class=HTMLResponse)
def imprimir_os(id: int):
    conn = get_db()
    os_row = conn.execute("""
        SELECT o.*, c.nome as cliente_nome, c.telefone as cliente_tel, c.email as cliente_email, c.cpf as cliente_cpf,
               v.placa, v.modelo, v.marca, v.ano, v.cor, v.km as veiculo_km,
               u.nome_oficina, u.nome as mecanico_chefe, u.telefone as oficina_tel
        FROM ordens_servico o
        JOIN clientes c ON c.id=o.cliente_id
        JOIN veiculos v ON v.id=o.veiculo_id
        JOIN usuarios u ON u.id=o.usuario_id
        WHERE o.id=?
    """, (id,)).fetchone()
    
    if not os_row:
        conn.close()
        raise HTTPException(404, "OS não encontrada")
        
    os_data = dict(os_row)
    checklist = [dict(r) for r in conn.execute("SELECT * FROM checklist_itens WHERE os_id=? ORDER BY id", (id,)).fetchall()]
    orcamento = [dict(r) for r in conn.execute("SELECT * FROM os_itens_orcamento WHERE os_id=? ORDER BY id", (id,)).fetchall()]
    scanner = [dict(r) for r in conn.execute("SELECT * FROM scanner_reports WHERE os_id=? ORDER BY criado_em DESC", (id,)).fetchall()]
    conn.close()
    
    total_pecas = sum(r["subtotal"] for r in orcamento if r["tipo"] == "peca")
    total_servicos = sum(r["subtotal"] for r in orcamento if r["tipo"] == "servico")
    total_geral = total_pecas + total_servicos
    
    linhas_orcamento = ""
    for r in orcamento:
        tipo_lbl = "🔧 Serviço" if r["tipo"] == "servico" else "📦 Peça"
        linhas_orcamento += f"<tr><td><b>{tipo_lbl}</b></td><td>{r['descricao']}</td><td style='text-align:center'>{r['quantidade']}</td><td style='text-align:right'>R$ {r['valor_unitario']:.2f}</td><td style='text-align:right;font-weight:700'>R$ {r['subtotal']:.2f}</td></tr>"
        
    secao_orcamento = ""
    if orcamento:
        pagto_html = f"<div class='totais-row' style='margin-top:4px;font-size:11px;color:#64748b'><span>Forma de Pagamento:</span><span><b>{os_data['forma_pagamento']}</b></span></div>" if os_data.get("forma_pagamento") else ""
        secao_orcamento = f"""
        <div class="section-title">💰 Orçamento de Peças e Mão de Obra</div>
        <table>
          <thead>
            <tr>
              <th style="width:14%">Tipo</th>
              <th>Descrição</th>
              <th style="width:10%;text-align:center">Qtd</th>
              <th style="width:18%;text-align:right">Valor Unit.</th>
              <th style="width:18%;text-align:right">Subtotal</th>
            </tr>
          </thead>
          <tbody>{linhas_orcamento}</tbody>
        </table>
        <div class="totais-box">
          <div class="totais-row"><span>Total em Peças:</span><span>R$ {total_pecas:.2f}</span></div>
          <div class="totais-row"><span>Total em Serviços:</span><span>R$ {total_servicos:.2f}</span></div>
          <div class="totais-row final"><span>VALOR TOTAL:</span><span style="color:#0f172a">R$ {total_geral:.2f}</span></div>
          {pagto_html}
        </div>
        """

    linhas_chk = ""
    for c in checklist:
        st_cls = "status-ok" if c["status"] == "OK" else ("status-atencao" if c["status"] == "Atenção" else "status-problema")
        obs_txt = c["observacao"] or "Conforme padrão de segurança"
        linhas_chk += f"<tr><td style='font-weight:600'>{c['item']}</td><td><span class='{st_cls}'>{c['status']}</span></td><td style='color:#475569'>{obs_txt}</td></tr>"

    secao_scanner = ""
    if scanner:
        linhas_sc = ""
        for s in scanner:
            dtc = s["dtcs"] or "Nenhuma falha ativa"
            linhas_sc += f"<div class='box' style='margin-bottom:8px'><div class='box-row'><span>Telemetria:</span><span>RPM: {s['rpm']} | Temp: {s['temperatura']}°C | Tensão: {s['tensao']}V</span></div><div class='box-row'><span>Falhas (DTCs):</span><span style='color:#dc2626;font-weight:700'>{dtc}</span></div></div>"
        secao_scanner = f"<div class='section-title'>🔍 Diagnóstico Computadorizado / Scanner</div>{linhas_sc}"

    assinatura_img_html = f"<img src='/uploads/{os_data["assinatura_cliente"]}' class='assinatura-img'/>" if os_data.get("assinatura_cliente") else ""
    km_troca_txt = f"{os_data.get('km_proxima_troca')} km" if os_data.get('km_proxima_troca') else "—"
    if os_data.get("data_proxima_troca"):
        km_troca_txt += f" ({os_data.get('data_proxima_troca')})"

    html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Laudo Técnico & Orçamento - OS #{os_data['id']}</title>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }}
    body {{ background: #fff; color: #1e293b; padding: 24px; font-size: 13px; line-height: 1.4; }}
    .header {{ display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #f59e0b; padding-bottom: 12px; margin-bottom: 16px; }}
    .logo-box h1 {{ font-size: 24px; font-weight: 900; color: #0f172a; letter-spacing: 1px; }}
    .logo-box .sub {{ font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-top: 2px; }}
    .os-badge {{ text-align: right; }}
    .os-badge .num {{ font-size: 20px; font-weight: 800; color: #f59e0b; }}
    .os-badge .data {{ font-size: 11px; color: #64748b; }}
    
    .grid-2 {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }}
    .box {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }}
    .box-title {{ font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; margin-bottom: 6px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }}
    .box-row {{ display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px; }}
    .box-row span:first-child {{ color: #64748b; font-weight: 500; }}
    .box-row span:last-child {{ font-weight: 700; color: #0f172a; }}
    
    .section-title {{ font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin: 16px 0 8px; border-left: 4px solid #f59e0b; padding-left: 8px; }}
    
    table {{ width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 12px; }}
    th {{ background: #0f172a; color: #fff; padding: 8px 10px; text-align: left; font-weight: 700; font-size: 11px; text-transform: uppercase; }}
    td {{ padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }}
    tr:nth-child(even) td {{ background: #f8fafc; }}
    .status-ok {{ color: #16a34a; font-weight: 700; }}
    .status-atencao {{ color: #d97706; font-weight: 700; }}
    .status-problema {{ color: #dc2626; font-weight: 700; }}
    
    .totais-box {{ margin-left: auto; width: 280px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; }}
    .totais-row {{ display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px; }}
    .totais-row.final {{ font-size: 15px; font-weight: 900; color: #0f172a; border-top: 2px solid #cbd5e1; padding-top: 6px; margin-top: 6px; }}
    
    .assinatura-box {{ display: flex; justify-content: space-between; align-items: flex-end; margin-top: 30px; padding-top: 20px; page-break-inside: avoid; }}
    .assinatura-line {{ width: 45%; text-align: center; border-top: 1px solid #0f172a; padding-top: 6px; font-size: 11px; font-weight: 700; color: #334155; }}
    .assinatura-img {{ max-height: 50px; max-width: 180px; margin-bottom: 4px; display: block; margin-left: auto; margin-right: auto; }}
    
    @media print {{
      body {{ padding: 0; }}
      .no-print {{ display: none !important; }}
    }}
  </style>
</head>
<body>
  <div class="no-print" style="background:#0f172a;color:#fff;padding:12px 20px;border-radius:8px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center">
    <span>🖨️ Visualização de Impressão / Salvar em PDF</span>
    <button onclick="window.print()" style="background:#f59e0b;color:#0f172a;border:none;font-weight:800;padding:8px 18px;border-radius:6px;cursor:pointer;font-size:13px">
      Imprimir / Salvar PDF
    </button>
  </div>

  <div class="header">
    <div class="logo-box">
      <h1>{os_data['nome_oficina']}</h1>
      <div class="sub">Centro Automotivo & Diagnóstico Computadorizado</div>
    </div>
    <div class="os-badge">
      <div class="num">ORDEM DE SERVIÇO #{os_data['id']}</div>
      <div class="data">Data de Entrada: {os_data['criado_em']}</div>
      <div class="data" style="margin-top:2px">Status: <b>{os_data['status']}</b></div>
    </div>
  </div>

  <div class="grid-2">
    <div class="box">
      <div class="box-title">👤 Dados do Cliente</div>
      <div class="box-row"><span>Nome:</span><span>{os_data['cliente_nome']}</span></div>
      <div class="box-row"><span>Telefone:</span><span>{os_data['cliente_tel'] or '—'}</span></div>
      <div class="box-row"><span>E-mail:</span><span>{os_data['cliente_email'] or '—'}</span></div>
      <div class="box-row"><span>CPF:</span><span>{os_data['cliente_cpf'] or '—'}</span></div>
    </div>

    <div class="box">
      <div class="box-title">🚗 Dados do Veículo</div>
      <div class="box-row"><span>Placa:</span><span style="font-size:14px;letter-spacing:1px">{os_data['placa']}</span></div>
      <div class="box-row"><span>Modelo / Marca:</span><span>{os_data['marca']} {os_data['modelo']} {os_data['ano'] or ''}</span></div>
      <div class="box-row"><span>KM de Entrada:</span><span>{os_data.get('km_atual') or os_data.get('veiculo_km') or 0} km</span></div>
      <div class="box-row"><span>Próxima Troca de Óleo:</span><span>{km_troca_txt}</span></div>
    </div>
  </div>

  {secao_orcamento}

  <div class="section-title">✅ Laudo de Inspeção e Checklist ({len(checklist)} Itens)</div>
  <table>
    <thead>
      <tr>
        <th>Item Inspecionado</th>
        <th style="width:18%">Condição</th>
        <th>Observações Técnicas</th>
      </tr>
    </thead>
    <tbody>{linhas_chk}</tbody>
  </table>

  {secao_scanner}

  <div class="assinatura-box">
    <div class="assinatura-line">
      {os_data.get('mecanico') or os_data.get('mecanico_chefe') or 'Responsável Técnico'}
      <div style="font-size:10px;color:#64748b;font-weight:400;margin-top:2px">Mecânico / Oficina</div>
    </div>

    <div class="assinatura-line">
      {assinatura_img_html}
      {os_data['cliente_nome']}
      <div style="font-size:10px;color:#64748b;font-weight:400;margin-top:2px">Assinatura do Cliente</div>
    </div>
  </div>

  <div style="text-align:center;font-size:10px;color:#94a3b8;margin-top:24px">
    Documento emitido eletronicamente pelo Sistema DRIVER · {os_data['nome_oficina']}
  </div>
</body>
</html>
"""
    return HTMLResponse(content=html)

# ─── SERVIR FRONTEND ESTÁTICO ─────────────────────────────────────────────────
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
