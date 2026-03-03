const express = require('express');
const session = require('express-session');
const fileupload = require('express-fileupload');
const path = require('path');
const fs = require('fs');
const mysql2 = require('mysql2');
const bcrypt = require('bcrypt');

const app = express();

// ================= CONEXÃO MYSQL (RAILWAY SAFE) =================

let connection;

if (process.env.DATABASE_URL) {
  console.log("🔗 Usando DATABASE_URL");
  connection = mysql2.createPool(process.env.DATABASE_URL);
} else {
  console.log("🔗 Usando variáveis MYSQL separadas");

  const dbConfig = {
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    port: Number(process.env.MYSQLPORT) || 3306
  };

  console.log("DB CONFIG:", dbConfig);

  if (!dbConfig.host) {
    console.error("❌ Variáveis de banco não carregaram.");
    process.exit(1);
  }

  connection = mysql2.createPool(dbConfig);
}

connection.getConnection((err, conn) => {
  if (err) {
    console.error("❌ Erro ao conectar MySQL:", err);
  } else {
    console.log("✅ MySQL conectado 🚀");
    conn.release();
  }
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

// ================= MIDDLEWARE LOGIN =================
function verificaLogin(req, res, next) {
  if (req.session.usuario) return next();
  res.redirect('/login');
}

// ================= ROTAS =================

// HOME
app.get('/', (req, res) => {
  connection.query('SELECT * FROM produtos', (erro, retorno) => {
    if (erro) return res.send("Erro no banco");
    res.render('appPrincipal', { produtos: retorno });
  });
});

// PRODUTOS
app.get('/produtos', (req, res) => {
  connection.query('SELECT * FROM produtos', (erro, retorno) => {
    if (erro) return res.send("Erro no banco");
    res.render('appProdutos', { produtos: retorno });
  });
});

// CADASTRO
app.get('/cadastro', verificaLogin, (req, res) => {
  connection.query('SELECT * FROM produtos', (erro, retorno) => {
    if (erro) return res.send("Erro no banco");
    res.render('appCadastro', { produtos: retorno });
  });
});

// LOGIN
app.get('/login', (req, res) => {
  res.render('appLogin');
});

app.post('/login', (req, res) => {
  const { login, password } = req.body;

  connection.query(
    'SELECT * FROM login WHERE login = ?',
    [login],
    async (erro, retorno) => {
      if (erro) return res.send('Erro no banco');
      if (retorno.length === 0) return res.send('Login inválido');

      const senhaOk = await bcrypt.compare(password, retorno[0].senha);
      if (!senhaOk) return res.send('Senha inválida');

      req.session.usuario = retorno[0].login;
      res.redirect('/cadastro');
    }
  );
});

// CADASTRAR PRODUTO
app.post('/cadastrar', verificaLogin, (req, res) => {
  const { nome, marca, armazenamento, valor } = req.body;

  if (!req.files || !req.files.imagem)
    return res.send("Imagem obrigatória");

  const imagem = req.files.imagem.name;

  connection.query(
    `INSERT INTO produtos(nome, marca, armazenamento, valor, imagem)
     VALUES (?,?,?,?,?)`,
    [nome, marca, armazenamento, valor, imagem],
    (erro) => {
      if (erro) return res.send("Erro ao cadastrar");

      req.files.imagem.mv(
        path.join(__dirname, 'public/img', imagem),
        (err) => {
          if (err) console.error("Erro ao salvar imagem:", err);
          res.redirect('/cadastro');
        }
      );
    }
  );
});

// DELETAR PRODUTO
app.post('/deletar/:codigo/:imagem', verificaLogin, (req, res) => {
  const { codigo, imagem } = req.params;

  connection.query(
    'DELETE FROM produtos WHERE codigo = ?',
    [codigo],
    (erro) => {
      if (erro) return res.send("Erro ao deletar");

      const caminhoImagem = path.join(__dirname, 'public/img', imagem);

      fs.unlink(caminhoImagem, (err) => {
        if (err) console.error('Erro ao remover imagem:', err.message);
        res.redirect('/cadastro');
      });
    }
  );
});

// ================= SERVIDOR =================
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});