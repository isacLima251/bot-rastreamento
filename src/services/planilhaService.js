const XLSX = require('xlsx');
const path = require('path');

function lerPlanilha(nomeArquivo) {
    const caminho = path.join(__dirname, '../../', nomeArquivo);
    const workbook = XLSX.readFile(caminho);
    const aba = workbook.Sheets[workbook.SheetNames[0]];
    const dados = XLSX.utils.sheet_to_json(aba);

    return dados.map(item => ({
        nome: item.Nome,
        telefone: item.Telefone,
        produto: item.Produto,
        codigoRastreio: item['Código de Rastreio'] || '',
        dataPostagem: item['Data da Postagem'] || '',
    }));
}

module.exports = { lerPlanilha };
