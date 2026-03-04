const express = require('express');
const session = require('express-session');
const fileupload = require('express-fileupload');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const app = express();

// ================= CONEXÃO POSTGRES (RENDER) =================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.connect()
  .then(() => console.log("✅ PostgreSQL conectado 🚀"))
  .catch(err => {
    console.error("❌ Erro ao conectar PostgreSQL:", err);
    process.exit(1);
  });

// ================= MIDDLEWARES =================

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'segredo_super_forte',
  resave: false,
  saveUninitialized: false
}));

app.use(fileupload({
  createParentPath: true
}));

// ================= VIEW ENGINE =================

app.set('view engine', 'ejs');

// ================= ARQUIVOS ESTÁTICOS =================

app.use(express.static(path.join(__dirname, 'public')));
app.use('/public/img', express.static(path.join(__dirname, 'public/img')));

// ================= LOGIN MIDDLEWARE =================

function verificaLogin(req, res, next) {
  if (req.session.usuario) return next();
  res.redirect('/login');
}

// ================= ROTAS =================

// HOME
app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM produtos');
    res.render('appPrincipal', { produtos: result.rows });
  } catch {
    res.send("Erro no banco");
  }
});

// PRODUTOS
app.get('/produtos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM produtos');
    res.render('appProdutos', { produtos: result.rows });
  } catch {
    res.send("Erro no banco");
  }
});

// CADASTRO
app.get('/cadastro', verificaLogin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM produtos');
    res.render('appCadastro', { produtos: result.rows });
  } catch {
    res.send("Erro no banco");
  }
});

// LOGIN
app.get('/login', (req, res) => {
  res.render('appLogin');
});

app.post('/login', async (req, res) => {
  const { login, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM login WHERE login = $1',
      [login]
    );

    if (result.rows.length === 0)
      return res.send('Login inválido');

    const usuario = result.rows[0];

    const senhaOk = await bcrypt.compare(password, usuario.senha);

    if (!senhaOk)
      return res.send('Senha inválida');

    req.session.usuario = usuario.login;
    res.redirect('/cadastro');

  } catch {
    res.send('Erro no banco');
  }
});

// CADASTRAR PRODUTO
app.post('/cadastrar', verificaLogin, async (req, res) => {
  const { nome, marca, armazenamento, valor } = req.body;

  if (!req.files || !req.files.imagem)
    return res.send("Imagem obrigatória");

  const imagem = req.files.imagem.name;

  try {
    await pool.query(
      `INSERT INTO produtos(nome, marca, armazenamento, valor, imagem)
       VALUES ($1,$2,$3,$4,$5)`,
      [nome, marca, armazenamento, valor, imagem]
    );

    req.files.imagem.mv(
      path.join(__dirname, 'public/img', imagem),
      () => res.redirect('/cadastro')
    );

  } catch {
    res.send("Erro ao cadastrar");
  }
});

// DELETAR
app.post('/deletar/:codigo/:imagem', verificaLogin, async (req, res) => {
  const { codigo, imagem } = req.params;

  try {
    await pool.query(
      'DELETE FROM produtos WHERE codigo = $1',
      [codigo]
    );

    fs.unlink(
      path.join(__dirname, 'public/img', imagem),
      () => res.redirect('/cadastro')
    );

  } catch {
    res.send("Erro ao deletar");
  }
});

// ================= SERVIDOR =================

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});