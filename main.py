from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import sqlite3, os, uuid
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont
import io

app = FastAPI(title="DRIVER")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
DB_PATH = os.path.join(BASE_DIR, "database.db")

os.makedirs(os.path.join(UPLOAD_DIR, "checklist"), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "scanner"), exist_ok=True)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS clientes (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, telefone TEXT, email TEXT, cpf TEXT, criado_em TEXT DEFAULT (datetime('now','localtime')));
        CREATE TABLE IF NOT EXISTS veiculos (id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INTEGER NOT NULL, placa TEXT NOT NULL, modelo TEXT, marca TEXT, ano INTEGER, cor TEXT, km INTEGER, FOREIGN KEY (cliente_id) REFERENCES clientes(id));
        CREATE TABLE IF NOT EXISTS ordens_servico (id INTEGER PRIMARY KEY AUTOINCREMENT, veiculo_id INTEGER NOT NULL, cliente_id INTEGER NOT NULL, status TEXT DEFAULT 'Aberta', descricao TEXT, mecanico TEXT, valor REAL, criado_em TEXT DEFAULT (datetime('now','localtime')), fechado_em TEXT, FOREIGN KEY (veiculo_id) REFERENCES veiculos(id), FOREIGN KEY (cliente_id) REFERENCES clientes(id));
        CREATE TABLE IF NOT EXISTS checklist_itens (id INTEGER PRIMARY KEY AUTOINCREMENT, os_id INTEGER NOT NULL, item TEXT NOT NULL, status TEXT DEFAULT 'OK', observacao TEXT, foto TEXT, criado_em TEXT DEFAULT (datetime('now','localtime')), FOREIGN KEY (os_id) REFERENCES ordens_servico(id));
        CREATE TABLE IF NOT EXISTS scanner_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, os_id INTEGER NOT NULL, veiculo_id INTEGER NOT NULL, dtcs TEXT, rpm INTEGER, temperatura INTEGER, tensao REAL, combustivel INTEGER, observacoes TEXT, foto TEXT, criado_em TEXT DEFAULT (datetime('now','localtime')), FOREIGN KEY (os_id) REFERENCES ordens_servico(id), FOREIGN KEY (veiculo_id) REFERENCES veiculos(id));
        CREATE TABLE IF NOT EXISTS configuracoes (chave TEXT PRIMARY KEY, valor TEXT);
        INSERT OR IGNORE INTO configuracoes VALUES ('nome_oficina', 'Minha Oficina');
        INSERT OR IGNORE INTO configuracoes VALUES ('telefone_oficina', '');
    """)
    conn.commit(); conn.close()

init_db()

def carimbar_foto(image_bytes):
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    draw = ImageDraw.Draw(img)
    agora = datetime.now().strftime("%d/%m/%Y  %H:%M hs")
    texto = f"  {agora}   | DRIVER  "
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

@app.get("/api/dashboard")
def dashboard():
    conn = get_db()
    d = {
        "total_clientes": conn.execute("SELECT COUNT(*) FROM clientes").fetchone()[0],
        "total_veiculos": conn.execute("SELECT COUNT(*) FROM veiculos").fetchone()[0],
        "os_abertas": conn.execute("SELECT COUNT(*) FROM ordens_servico WHERE status='Aberta'").fetchone()[0],
        "os_andamento": conn.execute("SELECT COUNT(*) FROM ordens_servico WHERE status='Em andamento'").fetchone()[0],
        "os_hoje": conn.execute("SELECT COUNT(*) FROM ordens_servico WHERE DATE(criado_em)=DATE('now','localtime')").fetchone()[0],
        "ultimas_os": [dict(r) for r in conn.execute("SELECT o.id,o.status,o.criado_em,c.nome as cliente,v.placa,v.modelo FROM ordens_servico o JOIN clientes c ON c.id=o.cliente_id JOIN veiculos v ON v.id=o.veiculo_id ORDER BY o.criado_em DESC LIMIT 5").fetchall()]
    }
    conn.close(); return d

@app.get("/api/clientes")
def listar_clientes():
    conn = get_db(); rows = conn.execute("SELECT * FROM clientes ORDER BY nome").fetchall(); conn.close(); return [dict(r) for r in rows]

@app.post("/api/clientes")
def criar_cliente(nome: str = Form(...), telefone: str = Form(""), email: str = Form(""), cpf: str = Form("")):
    conn = get_db(); cur = conn.execute("INSERT INTO clientes (nome,telefone,email,cpf) VALUES (?,?,?,?)",(nome,telefone,email,cpf)); conn.commit(); id=cur.lastrowid; conn.close(); return {"id":id,"mensagem":"ok"}

@app.get("/api/clientes/{id}")
def buscar_cliente(id: int):
    conn = get_db(); row = conn.execute("SELECT * FROM clientes WHERE id=?",(id,)).fetchone(); conn.close()
    if not row: raise HTTPException(404,"nao encontrado"); return dict(row)

@app.put("/api/clientes/{id}")
def atualizar_cliente(id: int, nome: str = Form(...), telefone: str = Form(""), email: str = Form(""), cpf: str = Form("")):
    conn = get_db(); conn.execute("UPDATE clientes SET nome=?,telefone=?,email=?,cpf=? WHERE id=?",(nome,telefone,email,cpf,id)); conn.commit(); conn.close(); return {"mensagem":"ok"}

@app.delete("/api/clientes/{id}")
def deletar_cliente(id: int):
    conn = get_db(); conn.execute("DELETE FROM clientes WHERE id=?",(id,)); conn.commit(); conn.close(); return {"mensagem":"ok"}

@app.get("/api/veiculos")
def listar_veiculos(cliente_id: int = None):
    conn = get_db()
    if cliente_id: rows = conn.execute("SELECT v.*,c.nome as cliente_nome FROM veiculos v JOIN clientes c ON c.id=v.cliente_id WHERE v.cliente_id=?",(cliente_id,)).fetchall()
    else: rows = conn.execute("SELECT v.*,c.nome as cliente_nome FROM veiculos v JOIN clientes c ON c.id=v.cliente_id ORDER BY v.placa").fetchall()
    conn.close(); return [dict(r) for r in rows]

@app.post("/api/veiculos")
def criar_veiculo(cliente_id: int = Form(...), placa: str = Form(...), modelo: str = Form(""), marca: str = Form(""), ano: int = Form(0), cor: str = Form(""), km: int = Form(0)):
    conn = get_db(); cur = conn.execute("INSERT INTO veiculos (cliente_id,placa,modelo,marca,ano,cor,km) VALUES (?,?,?,?,?,?,?)",(cliente_id,placa.upper(),modelo,marca,ano,cor,km)); conn.commit(); conn.close(); return {"id":cur.lastrowid}

@app.put("/api/veiculos/{id}")
def atualizar_veiculo(id: int, placa: str = Form(...), modelo: str = Form(""), marca: str = Form(""), ano: int = Form(0), cor: str = Form(""), km: int = Form(0)):
    conn = get_db(); conn.execute("UPDATE veiculos SET placa=?,modelo=?,marca=?,ano=?,cor=?,km=? WHERE id=?",(placa.upper(),modelo,marca,ano,cor,km,id)); conn.commit(); conn.close(); return {"mensagem":"ok"}

@app.get("/api/os")
def listar_os(status: str = None):
    conn = get_db()
    q = "SELECT o.*,c.nome as cliente_nome,v.placa,v.modelo FROM ordens_servico o JOIN clientes c ON c.id=o.cliente_id JOIN veiculos v ON v.id=o.veiculo_id {} ORDER BY o.criado_em DESC".format("WHERE o.status=?" if status else "")
    rows = conn.execute(q,(status,) if status else ()).fetchall(); conn.close(); return [dict(r) for r in rows]

@app.post("/api/os")
def criar_os(veiculo_id: int = Form(...), cliente_id: int = Form(...), descricao: str = Form(""), mecanico: str = Form("")):
    conn = get_db(); cur = conn.execute("INSERT INTO ordens_servico (veiculo_id,cliente_id,descricao,mecanico) VALUES (?,?,?,?)",(veiculo_id,cliente_id,descricao,mecanico)); conn.commit(); conn.close(); return {"id":cur.lastrowid}

@app.get("/api/os/{id}")
def buscar_os(id: int):
    conn = get_db()
    os = conn.execute("SELECT o.*,c.nome as cliente_nome,c.telefone as cliente_tel,v.placa,v.modelo,v.marca,v.ano,v.km FROM ordens_servico o JOIN clientes c ON c.id=o.cliente_id JOIN veiculos v ON v.id=o.veiculo_id WHERE o.id=?",(id,)).fetchone()
    checklist = conn.execute("SELECT * FROM checklist_itens WHERE os_id=?",(id,)).fetchall()
    scanner = conn.execute("SELECT * FROM scanner_reports WHERE os_id=?",(id,)).fetchall()
    conn.close()
    if not os: raise HTTPException(404,"nao encontrado")
    return {**dict(os),"checklist":[dict(c) for c in checklist],"scanner":[dict(s) for s in scanner]}

@app.put("/api/os/{id}/status")
def status_os(id: int, status: str = Form(...)):
    conn = get_db(); fechado = datetime.now().strftime("%Y-%m-%d %H:%M:%S") if status == "Fechada" else None
    conn.execute("UPDATE ordens_servico SET status=?,fechado_em=? WHERE id=?",(status,fechado,id)); conn.commit(); conn.close(); return {"mensagem":"ok"}

@app.post("/api/checklist")
async def add_checklist(os_id: int = Form(...), item: str = Form(...), status: str = Form("OK"), observacao: str = Form(""), foto: UploadFile = File(None)):
    foto_path = None
    if foto and foto.filename:
        conteudo = carimbar_foto(await foto.read()); nome = f"{uuid.uuid4().hex}.jpg"
        with open(os.path.join(UPLOAD_DIR,"checklist",nome),"wb") as f: f.write(conteudo)
        foto_path = f"checklist/{nome}"
    conn = get_db(); conn.execute("INSERT INTO checklist_itens (os_id,item,status,observacao,foto) VALUES (?,?,?,?,?)",(os_id,item,status,observacao,foto_path)); conn.commit(); conn.close()
    return {"mensagem":"ok","foto":foto_path}

@app.get("/api/checklist/{os_id}")
def get_checklist(os_id: int):
    conn = get_db(); rows = conn.execute("SELECT * FROM checklist_itens WHERE os_id=?",(os_id,)).fetchall(); conn.close(); return [dict(r) for r in rows]

@app.post("/api/scanner")
async def add_scanner(os_id: int = Form(...), veiculo_id: int = Form(...), dtcs: str = Form(""), rpm: int = Form(0), temperatura: int = Form(0), tensao: float = Form(0.0), combustivel: int = Form(0), observacoes: str = Form(""), foto: UploadFile = File(None)):
    foto_path = None
    if foto and foto.filename:
        conteudo = carimbar_foto(await foto.read()); nome = f"{uuid.uuid4().hex}.jpg"
        with open(os.path.join(UPLOAD_DIR,"scanner",nome),"wb") as f: f.write(conteudo)
        foto_path = f"scanner/{nome}"
    conn = get_db(); cur = conn.execute("INSERT INTO scanner_reports (os_id,veiculo_id,dtcs,rpm,temperatura,tensao,combustivel,observacoes,foto) VALUES (?,?,?,?,?,?,?,?,?)",(os_id,veiculo_id,dtcs,rpm,temperatura,tensao,combustivel,observacoes,foto_path)); conn.commit(); conn.close()
    return {"id":cur.lastrowid}

@app.get("/api/scanner/{veiculo_id}")
def historico_scanner(veiculo_id: int):
    conn = get_db(); rows = conn.execute("SELECT * FROM scanner_reports WHERE veiculo_id=? ORDER BY criado_em DESC",(veiculo_id,)).fetchall(); conn.close(); return [dict(r) for r in rows]

@app.get("/api/config")
def get_config():
    conn = get_db(); rows = conn.execute("SELECT * FROM configuracoes").fetchall(); conn.close(); return {r["chave"]:r["valor"] for r in rows}

@app.post("/api/config")
def set_config(chave: str = Form(...), valor: str = Form(...)):
    conn = get_db(); conn.execute("INSERT OR REPLACE INTO configuracoes VALUES (?,?)",(chave,valor)); conn.commit(); conn.close(); return {"mensagem":"ok"}

# Servir frontend
@app.get("/")
def root(): return FileResponse(os.path.join(BASE_DIR, "index.html"))

@app.get("/{path:path}")
def static_files(path: str):
    full = os.path.join(BASE_DIR, path)
    if os.path.isfile(full): return FileResponse(full)
    return FileResponse(os.path.join(BASE_DIR, "index.html"))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
