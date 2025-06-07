const { create } = require('venom-bot');

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

  const numero = '558299931606'; // 🔥 Seu número de teste aqui
  const mensagem = '🚀 Teste de envio - Bot funcionando com sucesso!';

  try {
    await client.sendText(`${numero}@c.us`, mensagem);
    console.log(`✅ Mensagem enviada para ${numero}`);
  } catch (error) {
    console.error(`❌ Erro ao enviar para ${numero}:`, error.message);
  }
})();
