const venom = require('venom-bot');

let client = null;

async function iniciarWhatsApp() {
    client = await venom.create({
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

    console.log('✅ WhatsApp conectado');
}

async function enviarMensagem(telefone, mensagem) {
    if (!client) {
        console.error('❌ WhatsApp não está conectado');
        return;
    }

    const numeroFormatado = `${telefone}@c.us`;

    try {
        await client.sendText(numeroFormatado, mensagem);
        console.log(`✅ Mensagem enviada para ${telefone}`);
    } catch (error) {
        console.error(`❌ Erro ao enviar para ${telefone}:`, error.message);
    }
}

module.exports = { iniciarWhatsApp, enviarMensagem };
