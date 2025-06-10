const { google } = require('googleapis');
const path = require('path');

const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, '../../credenciais.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheetId = '1O3NPxlgVQBcZ5W9NeFLQD717Ted9lHF5ZzM0eaS0aQ4';
const aBa = 'Página1';

async function lerPlanilhaGoogle() {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${aBa}!A1:J1000`,
    });

    const linhas = response.data.values;
    if (!linhas || linhas.length < 2) {
        console.log('❌ Nenhum dado de pedido encontrado na planilha.');
        return [];
    }

    const headers = linhas[0];
    const dados = linhas.slice(1).map((row, index) => {
        const obj = { rowIndex: index + 2 };
        headers.forEach((header, i) => {
            obj[header] = row[i] || '';
        });
        return obj;
    });

    return dados;
}

async function atualizarColunasDaLinha(linha, dadosParaAtualizar) {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    const data = Object.keys(dadosParaAtualizar).map(coluna => ({
        range: `<span class="math-inline">\{aBa\}\!</span>{coluna}${linha}`,
        values: [[dadosParaAtualizar[coluna]]],
    }));

    try {
        await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: sheetId,
            requestBody: {
                valueInputOption: 'RAW',
                data: data,
            },
        });
        console.log(`📌 Planilha atualizada na linha ${linha}:`, dadosParaAtualizar);
    } catch (err) {
        console.error(`❌ Erro ao atualizar a linha ${linha} da planilha:`, err.message);
        throw err;
    }
}

module.exports = {
    lerPlanilhaGoogle,
    atualizarColunasDaLinha,
};