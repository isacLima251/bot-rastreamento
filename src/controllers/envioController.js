const { lerPlanilhaGoogle, atualizarLinha } = require('../services/googleSheetService');
const { enviarMensagem } = require('../services/whatsappService');

async function enviarMensagensComRegras(client) {
    const pedidos = await lerPlanilhaGoogle();

    for (let i = 0; i < pedidos.length; i++) {
        const pedido = pedidos[i];
        const numero = pedido.telefone?.trim();

        if (!numero) {
            console.warn(`⚠️ Número de telefone inválido na linha ${i + 2}. Pulando...`);
            continue;
        }

        const status = (pedido['Status Interno'] || '').toLowerCase().trim();
        const msgAnterior = (pedido['Mensagem Último Status'] || '').toLowerCase().trim();
        let mensagem = null;
        let novaMensagemStatus = null;

        // 💬 Regra de boas-vindas para pedidos sem código
        if (!status || status === 'sem código') {
            if (!msgAnterior) {
                mensagem = `🎉 Parabéns pela sua compra do ${pedido.produto}, ${pedido.nome}! Em até 24h você receberá o código de rastreio.`;
                novaMensagemStatus = 'sem código';
            } else {
                console.log(`⏭️ ${pedido.nome} já recebeu a mensagem de boas-vindas.`);
            }
        }

        // 💬 Regras para status rastreáveis
        else if (msgAnterior !== status) {
            switch (status) {
                case 'postado':
                    mensagem = `📦 Olá ${pedido.nome}! Seu pedido do ${pedido.produto} foi postado no dia ${pedido.dataPostagem}. Código: ${pedido.codigoRastreio}.`;
                    novaMensagemStatus = 'postado';
                    break;
                case 'em trânsito':
                    mensagem = `🚚 ${pedido.nome}, seu pedido está a caminho de ${pedido.ultimaLocalizacao}. Fique ligado!`;
                    novaMensagemStatus = 'em trânsito';
                    break;
                case 'saiu para entrega':
                    mensagem = `🏠 ${pedido.nome}, seu pedido saiu para entrega. Receba com carinho!`;
                    novaMensagemStatus = 'saiu para entrega';
                    break;
                case 'entregue':
                    mensagem = `🎉 ${pedido.nome}, seu pedido foi entregue! Agradecemos a sua compra.`;
                    novaMensagemStatus = 'entregue';
                    break;
                default:
                    console.log(`ℹ️ Status '${status}' não tem mensagem configurada.`);
            }
        } else {
            console.log(`⏭️ ${pedido.nome} já recebeu mensagem para status '${status}', pulando.`);
        }

        // ✅ Envia e atualiza planilha
        if (mensagem) {
            try {
                await enviarMensagem(numero, mensagem, client);
                console.log(`✅ Mensagem enviada para ${numero}: ${novaMensagemStatus}`);
                await atualizarLinha(i + 2, { 'Mensagem Último Status': novaMensagemStatus });
            } catch (error) {
                console.error(`❌ Erro ao enviar para ${numero}:`, error.message);
            }
        }
    }

    console.log('🚀 Todos os envios finalizados!');
}

module.exports = { enviarMensagensComRegras };

