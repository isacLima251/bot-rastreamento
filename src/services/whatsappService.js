// src/services/whatsappService.js
let client = null;

// --- FUNÇÕES DE AJUDA ---

/**
 * Normaliza um número de telefone para o formato internacional brasileiro (55 + DDD + Número).
 */
function normalizeTelefone(telefoneRaw) {
    if (!telefoneRaw) return '';
    const digitos = String(telefoneRaw).replace(/\D/g, '');
    if (digitos.startsWith('55') && (digitos.length === 12 || digitos.length === 13)) {
        return digitos;
    }
    if (digitos.length === 10 || digitos.length === 11) {
        return `55${digitos}`;
    }
    return digitos;
}

// --- NOVA FUNÇÃO DE SCRAPING ROBUSTA ---
/**
 * Tenta "scrapar" a foto direto do header do chat no WhatsApp Web.
 * @param {string} telefone - número sem máscara.
 * @returns {Promise<string|null>} URL da foto, ou null.
 */
async function scrapeProfilePicViaPuppeteer(telefone) {
  const tel = normalizeTelefone(telefone);
  const page = client.page;
  
  // Abre o chat do contato (já autenticado)
  await page.goto(`https://web.whatsapp.com/send?phone=${tel}`, { waitUntil: 'networkidle2' });
  // Aguarda o header aparecer
  await page.waitForSelector('header', { visible: true, timeout: 10000 });

  // Executa a lógica de busca dentro do contexto do navegador
  const fotoUrl = await page.evaluate(() => {
    const header = document.querySelector('header');
    if (!header) return null;

    // 1) Tenta pegar a tag <img>, comum em versões mais novas do WA Web
    const img = header.querySelector('img');
    if (img && img.src) {
      return img.src;
    }

    // 2) Se não encontrar, busca qualquer elemento com 'background-image'
    const all = Array.from(header.querySelectorAll('div, span'));
    const avatar = all.find(el => {
      const bg = getComputedStyle(el).backgroundImage;
      return bg && bg !== 'none' && bg.startsWith('url');
    });
    if (avatar) {
      const bg = getComputedStyle(avatar).backgroundImage;
      // Extrai a URL de dentro de 'url("...")'
      return bg.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
    }

    return null;
  });

  // O Puppeteer pode retornar um 'blob:', que precisamos converter
  if (fotoUrl && fotoUrl.startsWith('blob:')) {
    console.log("[Fallback] Imagem é um blob. Convertendo para Base64...");
    const dataUri = await page.evaluate(async (url) => {
        const response = await window.fetch(url);
        const blob = await response.blob();
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });
    }, fotoUrl);
    return dataUri;
  }

  return fotoUrl;
}


// --- FUNÇÕES PRINCIPAIS DO SERVIÇO ---

function iniciarWhatsApp(venomClient) {
    client = venomClient;
    console.log('✅ WhatsApp Service pronto.');
}

async function enviarMensagem(telefone, mensagem) {
    if (!client) throw new Error('Cliente WhatsApp não iniciado.');
    const numeroNormalizado = normalizeTelefone(telefone);
    const numeroFormatado = `${numeroNormalizado}@c.us`;
    await client.sendText(numeroFormatado, mensagem);
}

/**
 * Busca a URL da foto de perfil, primeiro pela API e depois com fallback via Puppeteer.
 * @param {string} telefone O número do contato.
 * @returns {Promise<string|null>} A URL da foto ou nulo se não existir.
 */
async function getProfilePicUrl(telefone) {
    if (!client) {
        console.warn("Cliente Venom não está pronto para buscar fotos.");
        return null;
    }
    const contatoId = `${normalizeTelefone(telefone)}@c.us`;

    // --- ESTRATÉGIA 1: TENTATIVA VIA API OFICIAL DO VENOM ---
    try {
        console.log(`[API] Tentando via API para o contato: ${contatoId}`);
        const viaApi = await client.getProfilePicFromServer(contatoId);
        if (viaApi) {
            console.log(`[API] Sucesso! Foto encontrada via API.`);
            return viaApi;
        }
    } catch (error) {
        console.warn(`[API] Falhou para ${contatoId}. Motivo: ${error.message}. Ativando fallback.`);
    }

    // --- ESTRATÉGIA 2: FALLBACK VIA SCRAPING ROBUSTO COM PUPPETEER ---
    console.log(`[Fallback] Acionando fallback via Puppeteer.`);
    try {
        const viaScrape = await scrapeProfilePicViaPuppeteer(telefone);
        if (viaScrape) {
            console.log("[Fallback] Sucesso! Foto encontrada via Puppeteer.");
        }
        return viaScrape;
    } catch (err) {
        console.warn('Fallback Puppeteer falhou:', err);
        return null;
    }
}

module.exports = { 
    iniciarWhatsApp, 
    enviarMensagem,
    getProfilePicUrl
};