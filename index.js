const express = require('express');
const session = require('express-session')
const fileupload = require('express-fileupload');
const path = require('path');
const fs=require('fs');
const mysql2 =require('mysql2'); 
const bcrypt = require ('bcrypt')
const bodyParser = require('body-parser');
//conexao-----------------------------------------------------------
const conexao = mysql2.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'redbones123',
    database: 'projeto'
});

//Segredo---------------------------------------
const index = express();
const PORT = 8000;
index.use(session({
    secret: 'sadnkla',
    resave: false,
    saveUninitialized: false
}));

index.use(bodyParser.urlencoded({extended:true}));
//validacao de login--------------------------------------------------------
function verificaLogin(req, res, next) {
    if (req.session.usuario) {
        return next(); // pode acessar
    }
    res.redirect('/login'); // bloqueia acesso
}
// view engine--------------------------------------------------------------------
index.set('view engine', 'ejs');


// arquivos estáticos---
index.use(express.static(path.join(__dirname, 'public')));
index.use('/public/img',express.static('../public/img'));

// ⚠️ upload --------------------------------------------------------------------
index.use(fileupload({
    createParentPath: true
}));

// body parsers ------------------------------------------------------------------
index.use(express.urlencoded({ extended: true }));
index.use(express.json());
//ROTA PRINCIPAL-------------------------------------------------------
index.get('/',(req,res)=>{
     let sql= 'SELECT * FROM produtos';
   //executar o comando ssql
   conexao.query(sql,function(erro, retorno){
    res.render('indexPrincipal', {produtos:retorno});
   });
    
    //res.render('indexPrincipal');
    });

//ROTA DE PRODUTOS-----------------------------------------------------
index.get('/produtos',(req,res)=>{
    
       let sql= 'SELECT * FROM produtos';
   //executar o comando ssql
   conexao.query(sql,function(erro, retorno){
    res.render('indexProdutos', {produtos:retorno});
   });
    
   // res.render('indexProdutos');
});

// ROTA DE CADASTRO ---------------------------------------------------------------
index.get('/cadastro', verificaLogin, (req, res) => {
   // res.render('index');
   //SQL
   let sql= 'SELECT * FROM produtos';
   //executar o comando ssql
   conexao.query(sql,function(erro, retorno){
    res.render('indexCadastro', {produtos:retorno});
   });
});


// ROTA DE LOGIN---------------------------------------------------------------------------
index.get('/login', (req, res) => {res.render('indexLogin');});
index.post('/login', (req, res) => {

    const { login, password } = req.body;

    //console.log('Login:', login);
    //console.log('Senha:', password);

    const sql = 'SELECT * FROM login WHERE login = ?';

    conexao.query(sql, [login], async (erro, retorno) => {
        if (erro) {
            console.error(erro);
            return res.send('Erro no banco');
        }

        if (retorno.length === 0) {
            return res.send('Login ou senha inválidos');
        }
            const senhaOk = await bcrypt.compare(password, retorno[0].senha);
            if (!senhaOk) return res.send('Senha inválida');

            req.session.usuario = retorno[0].login;
            res.redirect('/cadastro');
    });
});

//POST DE CADASTRO-------------------------------------------------------------
index.post('/cadastrar', verificaLogin, (req, res) => {
    console.log('BODY:', req.body);
    console.log('FILES:', req.files);
   // req.files.imagem.mv(__dirname+'/public/img/'+req.files.imagem.name);
    //OBTER OS DADOS PARA CADASTRO 
    let nome = req.body.nome;
    let marca = req.body.marca;
    let armazenamento = req.body.armazenamento;
    let valor = req.body.valor;
    let imagem = req.files.imagem.name;
    let sql = `INSERT INTO produtos(nome, marca, armazenamento, valor, imagem) VALUES(?,?,?,?,?)`;

    //executar comando sql 
conexao.query(sql,[nome,marca,armazenamento,valor,imagem],function(erro,retorno){ 
        if(erro)throw erro;
        req.files.imagem.mv(__dirname+'/public/img/'+imagem);
        console.log(retorno);
        });
    //mandando de volta para a rota principal
        res.redirect('/cadastro');
});
//rota de deletar produtos
index.post('/deletar/:codigo/:imagem', verificaLogin, function(req,res){
    const codigo = req.params.codigo;
    const imagem = req.params.imagem;
    
    let sql = `DELETE FROM produtos WHERE codigo = ${codigo}`;
 conexao.query(sql,function(erro,retorno){
    if(erro)throw erro;

    const caminhoImagem = path.join(__dirname, 'public', 'img', imagem);
        console.log('Caminho:', caminhoImagem);

        fs.unlink(caminhoImagem, (err) => {
            if (err) {
                console.error('Erro ao remover imagem:', err.message);
            } else {
                console.log('Imagem removida com sucesso');
            }

            res.redirect('/cadastro');
        });
    });
});
// servidor
index.listen(PORT, () => {
    console.log('Servidor online na porta 8000');
});