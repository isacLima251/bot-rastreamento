// src/controllers/envioController.js
const pedidoService = require('../services/pedidoService');
const whatsappService = require('../services/whatsappService');

async function enviarMensagensComRegras(db) {
    console.log('🤖 Verificando mensagens para enviar...');
    try {
        const pedidos = await pedidoService.getAllPedidos(db);
        
        for (const pedido of pedidos) {
            const { id, nome, telefone, produto, codigoRastreio, statusInterno, mensagemUltimoStatus } = pedido;
            let mensagemParaEnviar = null;
            let novoStatusDaMensagem = null;

            if (codigoRastreio && codigoRastreio !== '-') {
                if (statusInterno && statusInterno.toLowerCase() !== mensagemUltimoStatus) {
                    switch (statusInterno.toLowerCase()) {
                        case 'postado':
                            mensagemParaEnviar = `📦 Olá ${nome}! O seu pedido do ${produto} foi postado. Código: ${codigoRastreio}.`;
                            novoStatusDaMensagem = 'postado';
                            break;
                        case 'objeto expedido':
                            mensagemParaEnviar = `✈️ Olá ${nome}, boa notícia! O seu pedido foi expedido e está a caminho.`;
                            novoStatusDaMensagem = 'objeto expedido';
                            break;
                        // Adicione outros status aqui...
                    }
                }
            } else {
                if (!mensagemUltimoStatus) {
                    mensagemParaEnviar = `🎉 Parabéns pela sua compra do ${produto}, ${nome}! Em até 24h receberá o seu código de rastreio.`;
                    novoStatusDaMensagem = 'boas-vindas enviada';
                }
            }

            if (mensagemParaEnviar && novoStatusDaMensagem) {
                await whatsappService.enviarMensagem(telefone, mensagemParaEnviar);
                // GUARDA NO HISTÓRICO
                await pedidoService.addMensagemHistorico(db, id, mensagemParaEnviar, novoStatusDaMensagem);
                await pedidoService.updateCamposPedido(db, id, { mensagemUltimoStatus: novoStatusDaMensagem });
                console.log(`✅ Mensagem de '${novoStatusDaMensagem}' enviada e registada para ${nome}.`);
            }
        }
    } catch (err) {
        console.error("❌ Falha no ciclo de envio de mensagens:", err);
    }
}

module.exports = { enviarMensagensComRegras };
