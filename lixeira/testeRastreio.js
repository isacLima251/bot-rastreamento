const puppeteer = require('puppeteer');

async function consultarRastreioCorreios(codigo) {
    const navegador = await puppeteer.launch({
        headless: false, // 🔥 Deixa visível pra acompanhar (muda pra true se quiser)
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const pagina = await navegador.newPage();

    try {
        console.log(`🔍 Acessando site dos Correios para ${codigo}...`);

        await pagina.goto('https://rastreamento.correios.com.br/', {
            waitUntil: 'networkidle2'
        });

        // Preenche o campo do código
        await pagina.type('input[placeholder="Insira seu código de rastreio"]', codigo);
        await pagina.click('button[type="submit"]');

        // Espera carregar os dados
        await pagina.waitForSelector('.ng-star-inserted');

        // Coleta os dados da página
        const dados = await pagina.evaluate(() => {
            const eventos = [];
            const elementos = document.querySelectorAll('app-evento');

            elementos.forEach(el => {
                const status = el.querySelector('.evento-titulo')?.innerText.trim() || '';
                const dataHora = el.querySelector('.evento-data')?.innerText.trim() || '';
                const local = el.querySelector('.evento-local')?.innerText.trim() || '';
                const detalhes = el.querySelector('.evento-detalhe')?.innerText.trim() || '';

                eventos.push({
                    status,
                    detalhes,
                    dataHora,
                    local
                });
            });

            const ultimo = eventos[0] || {
                status: 'Sem informação',
                detalhes: '',
                dataHora: '',
                local: ''
            };

            return {
                statusInterno: ultimo.status,
                ultimaLocalizacao: ultimo.local,
                ultimaAtualizacao: ultimo.dataHora,
                eventos
            };
        });

        await navegador.close();
        return dados;
    } catch (error) {
        await navegador.close();
        console.error(`❌ Erro no rastreio do código ${codigo}:`, error.message);
        return {
            statusInterno: 'Erro',
            ultimaLocalizacao: '-',
            ultimaAtualizacao: '-',
            eventos: []
        };
    }
}

// 🚀 TESTE AGORA
(async () => {
    const codigo = 'AM459692165BR'; // 🔥 Coloque aqui o código para testar
    const resultado = await consultarRastreioCorreios(codigo);

    console.log('✅ Resultado do rastreio:');
    console.log(JSON.stringify(resultado, null, 2));
})();
