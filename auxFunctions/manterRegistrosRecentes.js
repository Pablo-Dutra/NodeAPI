// ESSA FUNÇÃO SERVE PARA DEIXAR APENAS O ÚLTIMO TOKEN AUTENTICADO ATIVO
function manterRegistrosMaisRecentes(arrayRegistros) {
    const registrosFiltrados = [];
    const registrosPorId = {};  
    for (const registro of arrayRegistros) {
      const idUser = registro.idUser;
      if (idUser in registrosPorId) {
        const registroExistente = registrosPorId[idUser];
        if (registro.horario > registroExistente.horario) {
          registrosPorId[idUser] = registro;
        }
      } else {
        registrosPorId[idUser] = registro;
      }
    }
    for (const idUser in registrosPorId) {
      registrosFiltrados.push(registrosPorId[idUser]);
    }
    return registrosFiltrados;
};
module.exports = manterRegistrosMaisRecentes;