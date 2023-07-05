const axios = require('axios'); // Importa Biblioteca de integração de API;
async function trocarCodigoPorToken(code){
    const GITHUB_ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token';
    const body = {
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.REDIRECT_URL,
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET
    };
    try {
        const { data } = await axios.post(GITHUB_ACCESS_TOKEN_URL, body, { headers: { 'Content-Type': 'application/json' } });      
        const endIndex = data.indexOf('&scope=public_repo');
        const extractedToken = data.substring(0, endIndex).replace('access_token=', '');
        return extractedToken;
    } catch (error) {
        console.log(error);
        return 'erro';
    }
};
module.exports = trocarCodigoPorToken;