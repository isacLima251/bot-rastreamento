const { lerPlanilhaGoogle } = require('./src/services/googleSheetService');

const sheetId = 'SEU_ID_DA_PLANILHA';

lerPlanilhaGoogle(sheetId).then(dados => {
    console.log('Dados lidos da planilha:');
    console.table(dados);
}).catch(err => {
    console.error('Erro na leitura da planilha:', err);
});
