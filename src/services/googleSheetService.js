const { google } = require('googleapis');
const path = require('path');

// ID da planilha utilizado quando nenhum outro é informado nas chamadas
const DEFAULT_SHEET_ID = '1O3NPxlgVQBcZ5W9NeFLQD717Ted9lHF5ZzM0eaS0aQ4';

const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, '../../credenciais.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

/**
 * Lê os dados de uma planilha do Google Sheets.
 *
 * @param {string} [sheetId=DEFAULT_SHEET_ID] - ID da planilha a ser lida.
 *   Caso não informado, será utilizado o ID padrão definido no arquivo.
 */
async function lerPlanilhaGoogle(sheetId = DEFAULT_SHEET_ID) {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'Página1!A1:J1000', // 🔥 Ajusta o nome da aba e o range
    });

    const linhas = response.data.values;
    if (!linhas || linhas.length === 0) {
        console.log('❌ Nenhum dado encontrado na planilha.');
        return [];
    }

    const headers = linhas[0];
    const dados = linhas.slice(1).map(row => {
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = row[index] || '';
        });
        return obj;
    });

    return dados.map(item => ({
        nome: item.Nome || '',
        telefone: item.Telefone || '',
        produto: item.Produto || '',
        codigoRastreio: item['Código de Rastreio'] || '',
        dataPostagem: item['Data da Postagem'] || '',
        statusInterno: item['Status Interno'] || '',
        ultimaAtualizacao: item['Última Atualização'] || '',
        ultimaLocalizacao: item['Última Localização'] || '',
    }));
}

/**
 * Atualiza uma célula específica da planilha.
 *
 * @param {number} linha - Número da linha que será modificada.
 * @param {string} coluna - Letra da coluna (ex: 'A').
 * @param {string} valor - Valor a ser inserido na célula.
 * @param {string} [sheetId=DEFAULT_SHEET_ID] - ID da planilha a ser atualizada.
 */
async function atualizarLinha(linha, coluna, valor, sheetId = DEFAULT_SHEET_ID) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  const range = `Página1!${coluna}${linha}`;
  
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[valor]]
    }
  });

  console.log(`📌 Planilha atualizada: ${coluna}${linha} = ${valor}`);
}


module.exports = {
  lerPlanilhaGoogle,
  atualizarLinha
};
