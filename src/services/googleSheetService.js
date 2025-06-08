const { google } = require('googleapis');
const path = require('path');

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, '../../credenciais.json'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheetId = '1O3NPxlgVQBcZ5W9NeFLQD717Ted9lHF5ZzM0eaS0aQ4';

// ✅ Função para ler dados da planilha
async function lerPlanilhaGoogle() {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Página1!A1:J1000',
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
  dataPostagem: item['Data Postagem'] || '',
  statusInterno: item['Status Interno'] || '',
  ultimaLocalizacao: item['Última Localização'] || '',
  ultimaAtualizacao: item['Última Atualização'] || '',
  mensagemUltimoStatus: item['Mensagem Último Status'] || ''
}));

}

// ✅ Função para atualizar valores em uma linha da planilha
async function atualizarLinha(numeroLinha, dados) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  const colunas = Object.keys(dados);
  const valores = Object.values(dados);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Página1!A1:Z1',
  });

  const headers = res.data.values[0];
  const updates = [];

  for (let i = 0; i < colunas.length; i++) {
    const colunaIndex = headers.indexOf(colunas[i]);
    if (colunaIndex === -1) continue;

    const letraColuna = String.fromCharCode(65 + colunaIndex); // A, B, C, ...
    const celula = `${letraColuna}${numeroLinha}`;

    updates.push({
      range: `Página1!${celula}`,
      values: [[valores[i]]],
    });
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data: updates,
    },
  });

  console.log(`📝 Linha ${numeroLinha} atualizada com:`, dados);
}

module.exports = {
  lerPlanilhaGoogle,
  atualizarLinha
};
