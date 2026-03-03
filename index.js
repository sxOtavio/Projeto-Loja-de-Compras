const express = require('express');
const session = require('express-session');
const fileupload = require('express-fileupload');
const path = require('path');
const fs = require('fs');
const mysql2 = require('mysql2');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');

const app = express();

// ================= CONEXÃO MYSQL =================
const connection = mysql2.createConnection({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT
});

connection.connect((err) => {
  if (err) {
    console.error("Erro ao conectar MySQL:", err);
  } else {
    console.log("MySQL conectado 🚀");
  }
});

// ================= SESSÃO =================
app.use(session({
  secret: 'sadnkccxxxxxxcla',
  resave: false,
  saveUninitialized: false
}));

app.use(bodyParser.urlencoded({ extended: true }));

// ================= VIEW ENGINE =================
app.set('view engine', 'ejs');

// ================= ARQUIVOS ESTÁTICOS =================
app.use(express.static(path.join(__dirname, 'public')));
app.use('/public/img', express.static(path.join(__dirname, 'public/img')));

// ================= UPLOAD =================
app.use(fileupload({
  createParentPath: true
}));

// ================= BODY PARSER =================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ================= MIDDLEWARE LOGIN =================
function verificaLogin(req, res, next) {
  if (req.session.usuario) {
    return next();
  }
  res.redirect('/login');
}

// ================= ROTAS =================

// HOME
app.get('/', (req, res) => {
  const sql = 'SELECT * FROM produtos';

  connection.query(sql, (erro, retorno) => {
    if (erro) return res.send("Erro no banco");
    res.render('appPrincipal', { produtos: retorno });
  });
});

// PRODUTOS
app.get('/produtos', (req, res) => {
  const sql = 'SELECT * FROM produtos';

  connection.query(sql, (erro, retorno) => {
    if (erro) return res.send("Erro no banco");
    res.render('appProdutos', { produtos: retorno });
  });
});

// CADASTRO
app.get('/cadastro', verificaLogin, (req, res) => {
  const sql = 'SELECT * FROM produtos';

  connection.query(sql, (erro, retorno) => {
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

  const sql = 'SELECT * FROM login WHERE login = ?';

  connection.query(sql, [login], async (erro, retorno) => {
    if (erro) return res.send('Erro no banco');
    if (retorno.length === 0) return res.send('Login inválido');

    const senhaOk = await bcrypt.compare(password, retorno[0].senha);
    if (!senhaOk) return res.send('Senha inválida');

    req.session.usuario = retorno[0].login;
    res.redirect('/cadastro');
  });
});

// CADASTRAR PRODUTO
app.post('/cadastrar', verificaLogin, (req, res) => {

  const { nome, marca, armazenamento, valor } = req.body;
  const imagem = req.files.imagem.name;

  const sql = `
    INSERT INTO produtos(nome, marca, armazenamento, valor, imagem)
    VALUES (?,?,?,?,?)
  `;

  connection.query(
    sql,
    [nome, marca, armazenamento, valor, imagem],
    (erro) => {
      if (erro) throw erro;

      req.files.imagem.mv(
        path.join(__dirname, 'public/img', imagem)
      );

      res.redirect('/cadastro');
    }
  );
});

// DELETAR PRODUTO
app.post('/deletar/:codigo/:imagem', verificaLogin, (req, res) => {

  const { codigo, imagem } = req.params;

  const sql = 'DELETE FROM produtos WHERE codigo = ?';

  connection.query(sql, [codigo], (erro) => {
    if (erro) throw erro;

    const caminhoImagem = path.join(__dirname, 'public/img', imagem);

    fs.unlink(caminhoImagem, (err) => {
      if (err) console.error('Erro ao remover imagem:', err.message);
      res.redirect('/cadastro');
    });
  });
});

// ================= SERVIDOR =================
const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

module.exports = app;