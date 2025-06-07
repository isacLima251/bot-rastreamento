const { google } = require('googleapis');
const path = require('path');

const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, '../../credenciais.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

async function lerPlanilhaGoogle() {
    const sheetId = '1O3NPxlgVQBcZ5W9NeFLQD717Ted9lHF5ZzM0eaS0aQ4'; // 🔥 Substitui aqui pelo ID da sua planilha
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

async function atualizarLinha(linha, coluna, valor) {
  const sheetId = '1O3NPxlgVQBcZ5W9NeFLQD717Ted9lHF5ZzM0eaS0aQ4'; // ID da sua planilha
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
