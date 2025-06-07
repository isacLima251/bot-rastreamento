const { lerPlanilhaGoogle } = require('../services/googleSheetService');
const mensagens = require('../utils/messages.json');

// 🔥 Insira aqui o ID da sua planilha
const sheetId = '1O3NPxlgVQBcZ5W9NeFLQD717Ted9lHF5ZzM0eaS0aQ4';

async function gerarMensagens(req, res) {
    const pedidos = await lerPlanilhaGoogle(sheetId);

    const respostas = pedidos.map(pedido => {
        if (!pedido.codigoRastreio) {
            return {
                nome: pedido.nome,
                mensagem: mensagens.semCodigo
                    .replace('[nome]', pedido.nome)
                    .replace('[produto]', pedido.produto)
            };
        } else {
            return {
                nome: pedido.nome,
                mensagem: mensagens.comCodigo
                    .replace('[nome]', pedido.nome)
                    .replace('[produto]', pedido.produto)
                    .replace('[data]', pedido.dataPostagem)
                    .replace('[codigo]', pedido.codigoRastreio)
            };
        }
    });

    res.json(respostas);
}

module.exports = { gerarMensagens };
