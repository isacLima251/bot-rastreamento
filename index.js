const { create } = require('venom-bot');
const { enviarMensagensComRegras } = require('./src/controllers/envioController');
const moment = require('moment');

async function iniciarBot() {
    const client = await create({
        session: 'rastreamento-bot',
        multidevice: true,
        headless: false,
        disableWelcome: true,
        disableSpins: true,
        disableSessionRestore: false,
        deleteSessionOnLogout: false,
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

    console.log('✅ WhatsApp conectado com sucesso.');

    setInterval(async () => {
        const horario = moment().format('DD/MM/YYYY HH:mm:ss');
        console.log(`🕒 ${horario} — Iniciando verificação na planilha...`);

        await enviarMensagensComRegras(client);


        console.log(`✅ Verificação concluída.\n`);
    }, 30000); // A cada 30 segundos
}

iniciarBot();
