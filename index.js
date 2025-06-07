const { create } = require('venom-bot');
const { lerPlanilhaGoogle } = require('./src/services/googleSheetService');

(async () => {
    const client = await create({
        session: 'rastreamento-bot',
        multidevice: true,
        headless: false,
        disableWelcome: true,
        disableSpins: true,
        disableSessionRestore: true,
        deleteSessionOnLogout: true,
        puppeteerOptions: {
            timeout: 0,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-gpu',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-zygote',
                '--single-process',
                '--disable-web-security'
            ]
        }
    });

    const pedidos = await lerPlanilhaGoogle();

    for (const pedido of pedidos) {
        const numero = pedido.telefone;
        const mensagem = !pedido.codigoRastreio || pedido.codigoRastreio === '-'
            ? `🎉 Parabéns pela sua compra do ${pedido.produto} ${pedido.nome}! Em até 24h você receberá seu código de rastreio.`
            : `📦 Olá ${pedido.nome}! Seu pedido do ${pedido.produto} foi postado no dia ${pedido.dataPostagem}. Código de rastreio: ${pedido.codigoRastreio}.`;

        try {
            await client.sendText(`${numero}@c.us`, mensagem);
            console.log(`✅ Mensagem enviada para ${numero}`);
        } catch (error) {
            console.error(`❌ Erro ao enviar para ${numero}:`, error.message);
        }
    }

    console.log('🚀 Todos os envios finalizados!');
})();
