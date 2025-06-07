const { lerPlanilhaGoogle } = require('../services/googleSheetService');
const { enviarMensagem } = require('../services/whatsappService');
const mensagens = require('../utils/messages.json');

async function enviarMensagens() {
    const pedidos = await lerPlanilhaGoogle();

    for (const pedido of pedidos) {
        let mensagem = '';

        if (!pedido.codigoRastreio || pedido.codigoRastreio === '-' || pedido.codigoRastreio === '') {
            mensagem = mensagens.semCodigo
                .replace('[nome]', pedido.nome)
                .replace('[produto]', pedido.produto);
        } else {
            mensagem = mensagens.comCodigo
                .replace('[nome]', pedido.nome)
                .replace('[produto]', pedido.produto)
                .replace('[data]', pedido.dataPostagem)
                .replace('[codigo]', pedido.codigoRastreio);
        }

        console.log(`📤 Enviando mensagem para ${pedido.nome} (${pedido.telefone}):`);
        console.log(`➡️ ${mensagem}`);

        await enviarMensagem(pedido.telefone, mensagem);

        console.log(`✅ Mensagem enviada para ${pedido.nome} (${pedido.telefone})`);
        console.log('--------------------------------------------------');
    }
}

module.exports = { enviarMensagens };
