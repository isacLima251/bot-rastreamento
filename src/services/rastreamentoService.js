const axios = require('axios');
require('dotenv').config();

async function rastrearCodigo(codigo) {
  const API_KEY = process.env.SITERASTREIO_API_KEY;

  try {
    const response = await axios.post(
      'https://api.siterastreio.com.br/track',
      { code: codigo },
      {
        headers: {
          'Authorization': `Apikey ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = response.data;
    const json = JSON.parse(data.json);

    const eventos = json.eventos || [];

    // Pega o último evento
    const ultimoEvento = eventos[0] || {};

    return {
      statusInterno: ultimoEvento.descricaoFrontEnd || 'Desconhecido',
      ultimaLocalizacao: ultimoEvento.unidade?.endereco?.cidade || '-',
      ultimaAtualizacao: ultimoEvento.dtHrCriado?.date || '-',
      eventos
    };

  } catch (error) {
    console.error('❌ Erro ao consultar Site Rastreio:', error.response?.data || error.message);
    return {
      statusInterno: 'Erro',
      ultimaLocalizacao: '-',
      ultimaAtualizacao: '-',
      eventos: []
    };
  }
}

module.exports = {
  rastrearCodigo
};
