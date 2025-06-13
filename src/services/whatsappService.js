// src/services/whatsappService.js
let client = null;

/**
 * Normaliza um número de telefone para o formato internacional brasileiro (55 + DDD + Número).
 * @param {string} telefoneRaw O número de telefone "cru".
 * @returns {string} O número normalizado.
 */
function normalizeTelefone(telefoneRaw) {
    if (!telefoneRaw) return '';
    const digitos = String(telefoneRaw).replace(/\D/g, ''); // Remove tudo que não for dígito
    
    // Se o número já tiver o 55 e for do tamanho certo (12 ou 13 dígitos), retorna como está.
    if (digitos.startsWith('55') && (digitos.length === 12 || digitos.length === 13)) {
        return digitos;
    }
    // Se tiver 10 ou 11 dígitos (DDD + Número), assume Brasil e adiciona o 55.
    if (digitos.length === 10 || digitos.length === 11) {
        return `55${digitos}`;
    }
    // Para outros casos, retorna os dígitos limpos.
    return digitos;
}


async function iniciarWhatsApp(venomClient) {
    client = venomClient;
    console.log('✅ WhatsApp Service pronto.');
}

async function enviarMensagem(telefone, mensagem) {
    if (!client) throw new Error('Cliente WhatsApp não iniciado.');
    // Normaliza o número antes de enviar
    const numeroNormalizado = normalizeTelefone(telefone);
    const numeroFormatado = `${numeroNormalizado}@c.us`;
    await client.sendText(numeroFormatado, mensagem);
}

/**
 * Busca a URL da foto de perfil de um contacto.
 * @param {string} telefone O número do contacto.
 * @returns {Promise<string|null>} A URL da foto ou nulo se não existir.
 */
async function getProfilePicUrl(telefone) {
    if (!client) {
        console.warn("Cliente Venom não está pronto para buscar fotos.");
        return null;
    }

    // CORRECÇÃO: Usa a função de normalização
    const telNormalizado = normalizeTelefone(telefone);
    const contatoId = `${telNormalizado}@c.us`;

    try {
        const url = await client.getProfilePicFromServer(contatoId);
        return url; // Retorna a URL se encontrar
    } catch (error) {
        console.warn(`⚠️ Não foi possível obter a foto de perfil para ${contatoId}. Motivo: O contacto pode não ter foto, restrições de privacidade, ou o número pode estar incorrecto.`);
        return null; // Retorna nulo em caso de erro
    }
}

module.exports = { 
    iniciarWhatsApp, 
    enviarMensagem,
    getProfilePicUrl
};
