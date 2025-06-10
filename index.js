const venom = require('venom-bot');
const { enviarMensagensComRegras } = require('./src/controllers/envioController');
const whatsappService = require('./src/services/whatsappService');

console.log('Iniciando o bot de rastreamento...');

venom.create({
    session: 'rastreamento-bot',
    multidevice: true,
    headless: false,
})
.then(async (client) => {
    console.log('✅ Cliente Venom iniciado com sucesso!');
    await whatsappService.iniciarWhatsApp(client); 
    await enviarMensagensComRegras();
})
.catch((erro) => {
    console.error('❌ Erro ao iniciar o cliente Venom:', erro);
});