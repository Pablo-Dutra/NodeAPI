// REGISTRAR TODAS REQUISIÇÕES EM ARQUIVO DE LOG
const fs = require('fs');
const { AES, enc } = require('crypto-js');      // Importa Biblioteca de criptografia;

const gravaLog = (req, res, next) => {
    try {
        console.log('Esta requisição teve o seu log gravado..');
        const authorizationHeader = req.headers.authorization;
        let [accessToken, accessUser] = ['NãoHáToken','NãoHáUsuário'];
        let decryptedUser = '';
        if(authorizationHeader){
            [accessToken, accessUser] = authorizationHeader.split('.');
            const chaveCriptografia = process.env.CHAVE_CRIPTOGRAFIA;
            const decryptedBytes = AES.decrypt(accessUser, chaveCriptografia);
            decryptedUser = decryptedBytes.toString(enc.Utf8);
        }
        const log = `"${new Date().toISOString()}";"${req.ip}";"${req.method}";"${req.originalUrl}";"${JSON.stringify(req.body)}";"${decryptedUser}";"${accessToken}" \n`;
        fs.appendFile('./logs/requests.csv', log, err => { if (err) console.error(err); });
        next();              
    }catch(error) {
        console.log('Erro ao executar o serviço: Grava Log: ' + error);
        return res.status(500).json({ Resposta: 'Erro interno. Código GL500' });   
    }
}
module.exports = gravaLog;