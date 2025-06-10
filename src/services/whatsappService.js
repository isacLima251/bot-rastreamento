let client = null;

async function iniciarWhatsApp(venomClient) {
    if (!venomClient) {
        throw new Error("Cliente Venom não fornecido na inicialização do serviço.");
    }
    client = venomClient;
    console.log('✅ WhatsApp Service pronto para enviar mensagens.');
}

async function enviarMensagem(telefone, mensagem) {
    if (!client) {
        console.error('❌ Cliente WhatsApp não iniciado. A mensagem não pode ser enviada.');
        return;
    }

    const numeroFormatado = `${telefone}@c.us`;

    try {
        await client.sendText(numeroFormatado, mensagem);
    } catch (error) {
        console.error(`❌ Erro ao enviar para ${telefone}:`, error.message);
        throw error;
    }
}

module.exports = { iniciarWhatsApp, enviarMensagem };