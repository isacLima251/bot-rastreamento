// server.js
require('dotenv').config();
const express = require('express');
const venom = require('venom-bot');

const { initDb } = require('./src/database/database.js');
const whatsappService = require('./src/services/whatsappService.js');
const envioController = require('./src/controllers/envioController');
const rastreamentoController = require('./src/controllers/rastreamentoController'); // Importa o novo controlador
const pedidosController = require('./src/controllers/pedidosController');

const app = express();
const PORT = 3000;

const startApp = async () => {
    try {
        const db = await initDb();
        console.log("Banco de dados pronto.");

        // Configuração do Express (API e Painel)
        app.use(express.json());
        app.use(express.static('public'));
        app.use((req, res, next) => { req.db = db; next(); });
        app.get('/api/pedidos', pedidosController.listarPedidos);
        app.post('/api/pedidos', pedidosController.criarPedido);
        app.put('/api/pedidos/:id', pedidosController.atualizarPedido);
        app.delete('/api/pedidos/:id', pedidosController.deletarPedido);
        app.listen(PORT, () => console.log(`🚀 Servidor rodando em http://localhost:${PORT}`));
       
        // --- NOVA ROTA PARA O HISTÓRICO ---
        app.get('/api/pedidos/:id/historico', pedidosController.getHistoricoDoPedido);
        app.post('/api/pedidos/:id/enviar-mensagem', pedidosController.enviarMensagemManual);

        // Inicia o Bot do WhatsApp
        const client = await venom.create({ session: 'automaza-bot', headless: 'new' });
        await whatsappService.iniciarWhatsApp(client);
        console.log("✅ Bot WhatsApp pronto e integrado.");
        
        // --- INICIA AS ROTINAS AUTOMÁTICAS ---
        
        // 1. Rotina de Rastreamento (a cada 5 minutos)
        console.log("🛰️ Rotina de RASTREAMENTO de pedidos iniciada.");
        await rastreamentoController.verificarRastreios(db); // Roda na primeira vez
        setInterval(() => rastreamentoController.verificarRastreios(db), 300000); // 300000ms = 5 minutos

        // 2. Rotina de Envio de Mensagens (a cada 1 minuto)
        console.log("🔄 Rotina de ENVIO de mensagens iniciada.");
        await envioController.enviarMensagensComRegras(db); // Roda na primeira vez
        setInterval(() => envioController.enviarMensagensComRegras(db), 60000); // 60000ms = 1 minuto

    } catch (error) {
        console.error("❌ Falha fatal ao iniciar a aplicação:", error);
        process.exit(1);
    }
};

startApp();
