const fetch = require('node-fetch');

const API_KEY = 'RifKMrAGB7IrcB4L8SABCuPd11DT_U8ZL6t9lBS-SAM'; // coloque a chave que você recebeu
const CODIGO_RASTREIO = 'AM459692165BR';

async function rastrear() {
  try {
    const response = await fetch('https://api-labs.wonca.com.br/wonca.labs.v1.LabsService/Track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Apikey ${API_KEY}`
      },
      body: JSON.stringify({ code: CODIGO_RASTREIO })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status} - ${response.statusText}`);

    const data = await response.json();
    console.log('📦 Resultado do rastreio:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('❌ Erro na requisição:', err.message);
  }
}

rastrear();
