require('dotenv').config();
const axios = require('axios');

// Dados de acesso
const clientID = process.env.CORREIOS_CLIENT_ID;
const password = process.env.CORREIOS_PASSWORD;
const trackingCode = process.env.CODIGO_RASTREIO;

// Autenticação base64
const authBase64 = Buffer.from(`${clientID}:${password}`).toString('base64');

// Função para gerar o token
async function gerarToken() {
    try {
        const response = await axios.post(
            'https://api.correios.com.br/token/v1/autentica',
            {},
            {
                headers: {
                    Authorization: `Basic ${authBase64}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const token = response.data.token;
        const expira = response.data.expiraEm;
        console.log('✅ Token Gerado:', token);
        console.log('⏰ Expira em:', expira);
        return token;
    } catch (error) {
        console.error('❌ Erro ao gerar token:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
}

// Função para consultar rastreio
async function consultarRastreio(token) {
    try {
        const response = await axios.get(
            `https://api.correios.com.br/srorastro/v1/objetos/${trackingCode}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json'
                }
            }
        );

        const objeto = response.data.objetos[0];

        console.log('\n📦 Código:', objeto.codObjeto);
        console.log('🔍 Status:', objeto.eventos[0].descricao);
        console.log('📍 Local:', objeto.eventos[0].unidade.endereco.cidade + '/' + objeto.eventos[0].unidade.endereco.uf);
        console.log('🗓️ Data:', objeto.eventos[0].dtHrCriado);

        console.log('\n🗺️ Histórico completo:');
        objeto.eventos.forEach(evento => {
            console.log(`→ ${evento.descricao} em ${evento.unidade.endereco.cidade}/${evento.unidade.endereco.uf} - ${evento.dtHrCriado}`);
        });

    } catch (error) {
        console.error('❌ Erro ao consultar rastreio:', error.response ? error.response.data : error.message);
    }
}

// Execução
(async () => {
    const token = await gerarToken();
    await consultarRastreio(token);
})();

