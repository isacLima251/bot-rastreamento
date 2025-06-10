// src/services/rastreamentoService.js
const axios = require('axios');
require('dotenv').config();

/**
 * Consulta a API do Site Rastreio para obter o status de um código.
 * @param {string} codigo O código de rastreio.
 * @returns {Promise<object>} Um objeto com os dados do rastreio.
 */
async function rastrearCodigo(codigo) {
    const API_KEY = process.env.SITERASTREIO_API_KEY;
    if (!API_KEY) {
        console.error('❌ API Key do Site Rastreio não encontrada no arquivo .env');
        return { statusInterno: 'erro_config' };
    }

    try {
        // ATUALIZAÇÃO: Usando a URL e o formato da documentação que você encontrou.
        const url = 'https://api-labs.wonca.com.br/wonca.labs.v1.LabsService/Track';
        
        const payload = {
            "code": codigo 
        };
        
        const response = await axios.post(
            url,
            payload,
            {
                headers: {
                    // ATUALIZAÇÃO: Usando o método de autorização 'Apikey'
                    'Authorization': `Apikey ${API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const dados = response.data;
        // O formato da resposta pode ser diferente, vamos nos adaptar
        const eventos = dados.events || (dados.json ? JSON.parse(dados.json).eventos : []);
        
        if (!eventos || eventos.length === 0) {
            return { statusInterno: 'aguardando postagem', ultimaLocalizacao: '-', ultimaAtualizacao: '-' };
        }

        const ultimoEvento = eventos[0]; // O evento mais recente
        
        return {
            statusInterno: ultimoEvento.status || ultimoEvento.descricaoFrontEnd || 'Desconhecido',
            ultimaLocalizacao: ultimoEvento.location || ultimoEvento.unidade?.endereco?.cidade || '-',
            ultimaAtualizacao: `${ultimoEvento.date || ''} ${ultimoEvento.time || ''}`.trim() || ultimoEvento.dtHrCriado?.date || '-',
            eventos: eventos
        };

    } catch (error) {
        const mensagemErro = error.response?.data?.error || error.message;
        console.error(`❌ Erro ao consultar o código ${codigo}:`, mensagemErro);
        
        return {
            statusInterno: 'erro_api',
            ultimaLocalizacao: '-',
            ultimaAtualizacao: '-',
            eventos: []
        };
    }
}

module.exports = {
  rastrearCodigo
};
