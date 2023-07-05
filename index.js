/**********************************************/
/*      CONFIGURAÇÕES INICIAIS DA API         */
/**********************************************/

// FUNÇÕES AUXILIARES
const executarSQLS = require('./auxFunctions/executarSQLS');
const manterRegistrosMaisRecentes = require('./auxFunctions/manterRegistrosRecentes');
const verificaAdmin = require('./auxFunctions/verificaAdmins');
const mysql = require('mysql2');
// FUNÇÕES GITHUB
const dadosUsuario = require('./gitHubFunctions/dadosUsuario');
const trocarCodigoPorToken = require('./gitHubFunctions/trocarCodigoPorToken');
// MIDDLEWARES
const gravaLog = require('./middleWares/gravaLog');

const fs = require('fs');                         // Importa biblioteca que trata de arquivos;
const express = require('express');               // Importa Framework Express para Node JS;
const app = express();                            // Instancia o Express;
const { AES, enc } = require('crypto-js');        // Importa Biblioteca de criptografia;
const axios = require('axios');                   // Importa Biblioteca de integração de API;
const dotenv = require('dotenv');                 // Importa Biblioteca para gerenciar as variáveis de ambiente;
const cors = require('cors');                     // Importa Compartilhamento de Recursos de Origem Cruzada;
app.use( express.json() );                        // Utilizar o padrão JSON no Express;
app.use( cors() );                                // Utilizar o CORS;  

dotenv.config();

// REGISTRAR TODAS REQUISIÇÕES EM ARQUIVO DE LOG
app.use((req, res, next) => { gravaLog(req, res, next); });

// LIMITA O NÚMERO DE REQUISIÇÕES POR MINUTO
const rateLimit = require("express-rate-limit");  // Importa Biblhiteca que gerencia o limite de requisições;
const limite = 100;                               // Solicitações permitidas por minuto
const limiter = rateLimit({ windowMs: 60 * 1000, max: limite });
app.use(limiter);

// LIMITA O NÚMERO DE REQUISIÇÕES POR MINUTO PARA UMA ROTA ESPECÍFICA (LOGIN)
const limiteLogin = 5; 
const limiterLogin = rateLimit({ windowMs: 60 * 1000, max: limiteLogin });
app.use('/login',limiterLogin);

// INICIAR O SERVIDOR
app.listen(3000,'localhost');
console.log('API está rodando na porta 3000 ..');
console.log('Aceitando um limite de ' + limite + ' requisições por minuto..');

// USUARIOS AUTENTICADOS
let usuariosAutenticados = [];

// ROTA PARA FAZER LOGIN NO GITHUB E RECEBER O TOKEN
app.post("/login", async (req, res) => {
    try {
        this.token = await trocarCodigoPorToken(req.body.code);
        console.log('Token recebido do GITHUB: ' + this.token);
        const user = await dadosUsuario(this.token);
        const ipString = req.connection.remoteAddress;
        const parts = ipString.split(':');
        const ip = parts[parts.length - 1];
        const admin = verificaAdmin(user.id);
        const novoUsuario = {
            idUser: user.id,
            nome: user.name,
            token: this.token,
            horario: new Date(),
            ip: ip,
            admin: admin,
        };
        usuariosAutenticados.push(novoUsuario);
        res.send({ usuario: user, chave: this.token, idUser: user.id, isAdmin: admin });
    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }
});

// FUNÇÃO QUE VERIFICA SE A REQUISIÇÃO TEM AUTENTICAÇÃO
const checkAuth = (req, res, next) => {
    try {
        const authorizationHeader = req.headers.authorization;
        usuariosAutenticados = manterRegistrosMaisRecentes(usuariosAutenticados);
        const [accessToken, accessUser] = authorizationHeader.split('.');
        const chaveCriptografia = process.env.CHAVE_CRIPTOGRAFIA;
        const decryptedBytes = AES.decrypt(accessUser, chaveCriptografia);
        const decryptedUser = decryptedBytes.toString(enc.Utf8);
        let usuarioAutenticado = false;
        usuariosAutenticados.forEach(usuario => {
            const idUser = usuario.idUser.toString();
            if(idUser){
                if(idUser == decryptedUser && usuario.token == accessToken) {
                    usuarioAutenticado = true;
                }    
            }
        });
        if(usuarioAutenticado){
            next();
        }else{
            console.log('O cliente deve se autenticar para obter a resposta solicitada.');
            return res.status(401).json({ Resposta: 'Não autorizado.' });
        }        
    } catch (error) {
        console.log('Erro ao executar o serviço: checkAuth: ' + error);
        return res.status(500).json({ Resposta: 'Erro interno. Código CA500' }); 
    }
};

// LISTAR TODOS CARROS
app.get('/carros', checkAuth, (req, res) => {
    const owner = null;
    const query = `SELECT * FROM carros ORDER BY nome`;   
    const values = '';   
    executarSQLS(query, values, owner, res);      
});

// BUSCAR UM CARRO
app.get('/carros/:id?', checkAuth, (req, res) => {
    const id = parseInt(req.params.id);
    const owner = null;
    const query = `SELECT * FROM carros WHERE id = ?`;      
    const values = [id];
    executarSQLS(query, values, owner, res);    
});

// ADICIONANDO UM CARRO
app.post('/carros', checkAuth, (req, res) => {
    const [, accessUser] = req.headers.authorization.split('.');
    const owner = null;  
    const agora = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const nome = req.body.nome.substring(0,300);
    const modelo = req.body.modelo.substring(0,300);
    const marca = req.body.marca.substring(0,300);
    const ano = req.body.ano;
    const km = req.body.km;
    const fotos = req.body.fotos.substring(0,500);    
    const responsavel = (AES.decrypt(accessUser, process.env.CHAVE_CRIPTOGRAFIA)).toString(enc.Utf8);
    const status = req.body.status;
    const placa = req.body.placa;
    const query = `INSERT INTO carros(nome, modelo, marca, ano, km, fotos, responsavel, status, placa, createdAt, updatedAt) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;    
    const values = [nome, modelo, marca, ano, km, fotos, responsavel, status, placa, agora, agora];
    executarSQLS(query, values, owner, res);    
});

// EXCLUINDO UM CARRO
app.delete('/carros/:id', checkAuth, async (req, res) => {
  const id = req.params.id;
  const owner = {
    id: id,
    pessoa: req.headers.authorization,
  };
  const query = `DELETE FROM carros WHERE id = ?`;      
  const values = [id];
  executarSQLS(query,values,owner,res);  
});

// ATUALIZANDO UM CARRO
app.patch('/carros/:id', checkAuth, async (req, res) => {
    const id = req.params.id;
    const owner = {
      id: id,
      pessoa: req.headers.authorization,
    };
    const agora = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const nome = req.body.nome.substring(0,300);
    const modelo = req.body.modelo.substring(0,300);
    const marca = req.body.marca.substring(0,300);
    const ano = req.body.ano;
    const km = req.body.km;
    const fotos = req.body.fotos.substring(0,500);
    const status = req.body.status;
    const placa = req.body.placa;
    const query = `UPDATE carros SET nome=?,modelo=?, marca=?, ano=?, km=?, fotos=?, status=?, placa=?, updatedAt=? WHERE id = ?`;
    const values = [nome, modelo, marca, ano, km, fotos, status, placa, agora, id];
    executarSQLS(query,values,owner,res);
});

// ROTA PARA TER ACESSO AOS LOGS
app.get('/downloadLogs', (req, res) => {
  console.log('entrou aqui...');
  const filePath = 'logs/requests.csv';
  const fileName = 'logs.csv';
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
});


// LISTAR TODOS USUARIOS
app.get('/usuarios',  checkAuth, (req, res) => {
    console.log('Solicitação de usuários autenticados');
    console.log(usuariosAutenticados);    
    res.json(usuariosAutenticados);  
});
// DADOS DO USUARIO
app.get('/usuario/:token',  checkAuth, async (req, res) => {
    const accessToken = req.params.token;
    const infoUser = await dadosUsuario(accessToken);
    res.json(infoUser);  
});

// ACESSANDO API DE TERCEIROS PARA BUSCAR INFORMAÇÕES DE CARRO
app.get('/info/:placa?',  checkAuth, async (req, res) => {
  console.log('Entrou na busca do carro: ' + req.params.placa);
  const url = 'https://www.fipeplaca.com.br/_next/data/';
  const key = process.env.CHAVE_PLACAS;
  const endereco = url + key + '/search/' + req.params.placa + '.json';
  const response = await axios.get(endereco);
  console.log('Resposta do serviço: ');
  console.log(response.data.pageProps.vehicle);
  res.status(200).send(response.data.pageProps.vehicle);
});
 