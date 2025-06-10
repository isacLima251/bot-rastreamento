// src/controllers/rastreamentoController.js
const pedidoService = require('../services/pedidoService');
const rastreamentoService = require('../services/rastreamentoService');

/**
 * Procura por todos os pedidos que podem ser rastreados, consulta o seu status
 * e actualiza o banco de dados se houver alguma novidade.
 * @param {object} db A instância do banco de dados.
 */
async function verificarRastreios(db) {
    console.log('🔍 Iniciando verificação de rastreios...');
    try {
        const pedidos = await pedidoService.getAllPedidos(db);
        
        // Filtra apenas os pedidos que têm código e ainda não foram marcados como "entregue"
        const pedidosParaRastrear = pedidos.filter(p => p.codigoRastreio && p.statusInterno !== 'entregue');

        if (pedidosParaRastrear.length === 0) {
            console.log('ℹ️ Nenhum pedido para rastrear no momento.');
            return;
        }

        console.log(`🚚 Rastreando ${pedidosParaRastrear.length} pedido(s)...`);

        for (const pedido of pedidosParaRastrear) {
            const dadosRastreio = await rastreamentoService.rastrearCodigo(pedido.codigoRastreio);

            const novoStatus = (dadosRastreio.statusInterno || '').toLowerCase();

            // Actualiza o DB apenas se o status da API for novo e diferente do que já temos
            if (novoStatus && novoStatus !== pedido.statusInterno) {
                
                const dadosParaAtualizar = {
                    statusInterno: novoStatus,
                    ultimaLocalizacao: dadosRastreio.ultimaLocalizacao,
                    ultimaAtualizacao: dadosRastreio.ultimaAtualizacao,
                };
                
                await pedidoService.updateCamposPedido(db, pedido.id, dadosParaAtualizar);
                console.log(`🔄 Pedido #${pedido.id} (${pedido.nome}) atualizado para: ${novoStatus}`);
            }
        }
    } catch (err) {
        console.error('❌ Falha no ciclo de verificação de rastreios:', err);
    }
}

module.exports = { verificarRastreios };
