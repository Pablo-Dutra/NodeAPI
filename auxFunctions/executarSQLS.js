const { AES, enc } = require('crypto-js');
const mysql = require('mysql2');

function executarSQLS(query, values, owner, res){
    // CONFIGURA A CONEXÃO
    const connection = mysql.createConnection({
      host     : process.env.HOST,
      port     : process.env.PORTA,
      user     : process.env.USUARIO,
      password : process.env.PASSWORD,
      database : process.env.DATABASE,
    });

    // SE PASSADO ESSE PARÂMETRO DIFERENTE DE NULL, VERIFICA SE O REQUISITANTE TEM PERMISSÃO
    if(owner){
        console.log('Checagem se o requerente é o owner do registro: ');
        const [, accessUser] = owner.pessoa.split('.');
        const userAtual = (AES.decrypt(accessUser, process.env.CHAVE_CRIPTOGRAFIA)).toString(enc.Utf8);
        const queryInt = `SELECT responsavel FROM carros WHERE id = ?`;      
        const valuesInt = [owner.id];
        connection.query(queryInt, valuesInt, (errorInt, resultsInt) => {
            if (errorInt) {
                console.error('Erro ao executar a consulta:', errorInt);
                res.status(500).send('Erro interno do servidor');
            } else {
                // ENCONTROU RESULTADOS ?
                if(resultsInt.length > 0){
                    const userOwner = resultsInt[0].responsavel;
                    // O RESPONSÁVEL É O USUÁRIO LOGADO?
                    if(userOwner == userAtual){
                        console.log('Sim, é o owner.');
                        // EXECUTA A QUERY
                        connection.query(query, values, (error, results) => {
                            if (error) {
                                console.error('Erro ao executar a consulta:', error);
                                res.status(500).send('Erro interno do servidor');
                            } else {
                                console.log('RESPOSTA');
                                console.table(results);
                                res.status(200).json(results); 
                            }
                        });
                    }else{
                        console.log('Não, não é o owner.');
                        res.status(403).json({ Resposta: 'Acesso negado. Privilegios insuficientes.' }); 
                    }
                // SE NÃO ENCONTROU RESULTADOS    
                }else{
                    console.log('não encontrado!');
                    res.status(403).json({ Resposta: 'Acesso negado. Privilegios insuficientes.' }); 
                }
            }
        });
    }else{
        // EXECUTA A QUERY
        connection.query(query, values, (error, results) => {
            if (error) {
                console.error('Erro ao executar a consulta:', error);
                res.status(500).send('Erro interno do servidor');
            } else {
                console.log('RESPOSTA');
                console.table(results);
                res.status(200).json(results); 
            }
        });
    }
}
 
module.exports = executarSQLS;