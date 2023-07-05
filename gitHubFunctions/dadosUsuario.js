const axios = require('axios'); // Importa Biblioteca de integração de API;
async function dadosUsuario(token) {
    const response = await axios.get("http://api.github.com/user", {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return response.data;
};
module.exports = dadosUsuario;