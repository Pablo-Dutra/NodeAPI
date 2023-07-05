// ESSA FUNÇÃO SERVE VERIFICAR SE O USUÁRIO LOGADO É ADMINISTRADOR
const admins = [ 107048693, 107048694, 2334509];
function verificaAdmin(id) {
    if(admins.includes(id)){
        return true;
    }else{
        return false;
    }
};
module.exports = verificaAdmin;