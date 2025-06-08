async function enviarMensagem(telefone, mensagem, client) {
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

module.exports = { enviarMensagem };
