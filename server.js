// server.js
require('dotenv').config();
const express = require('express');
const venom = require('venom-bot');
const http = require('http'); // 1. Módulo HTTP nativo do Node.js
const { WebSocketServer } = require('ws'); // 2. Biblioteca de WebSocket

const { initDb } = require('./src/database/database.js');
const whatsappService = require('./src/services/whatsappService.js');
const pedidoService = require('./src/services/pedidoService.js');
const envioController = require('./src/controllers/envioController');
const rastreamentoController = require('./src/controllers/rastreamentoController');
const pedidosController = require('./src/controllers/pedidosController');

const app = express();
const PORT = 3000;

// 3. Cria um servidor HTTP a partir da nossa aplicação Express
const server = http.createServer(app);

// 4. Inicia o servidor WebSocket, "pendurado" no nosso servidor HTTP
const wss = new WebSocketServer({ server });

// 5. Guarda todos os painéis (clientes) que se conectarem
const clients = new Set();
wss.on('connection', (ws) => {
    console.log('🔗 Novo painel conectado via WebSocket.');
    clients.add(ws);
    ws.on('close', () => clients.delete(ws));
});

// 6. Função para enviar uma notificação para todos os painéis conectados
function broadcast(data) {
    const jsonData = JSON.stringify(data);
    for (const client of clients) {
        if (client.readyState === client.OPEN) {
            client.send(jsonData);
        }
    }
}

const startApp = async () => {
    try {
        const db = await initDb();
        console.log("Banco de dados pronto.");

        app.use(express.json());
        app.use(express.static('public'));
        app.use((req, res, next) => { req.db = db; next(); });
        
        // Rotas da API (sem alterações)
        app.get('/api/pedidos', pedidosController.listarPedidos);
        app.post('/api/pedidos', pedidosController.criarPedido);
        app.put('/api/pedidos/:id', pedidosController.atualizarPedido);
        app.delete('/api/pedidos/:id', pedidosController.deletarPedido);
        app.get('/api/pedidos/:id/historico', pedidosController.getHistoricoDoPedido);
        app.post('/api/pedidos/:id/enviar-mensagem', pedidosController.enviarMensagemManual);

        const client = await venom.create({ session: 'automaza-bot', headless: 'new' });
        await whatsappService.iniciarWhatsApp(client);
        console.log("✅ Bot WhatsApp pronto e integrado.");

        // 7. ACTUALIZAÇÃO: Ouvir mensagens e notificar os painéis
        client.onMessage(async (message) => {
            if (message.isGroupMsg || !message.body) return;
            const telefoneCliente = message.from.replace('@c.us', '');
            try {
                const pedido = await pedidoService.findPedidoByTelefone(db, telefoneCliente);
                if (pedido) {
                    console.log(`💬 Mensagem recebida de ${pedido.nome}`);
                    await pedidoService.addMensagemHistorico(db, pedido.id, message.body, 'recebida', 'cliente');
                    
                    // Notifica todos os painéis em tempo real!
                    broadcast({ type: 'nova_mensagem', pedidoId: pedido.id });
                }
            } catch (error) {
                console.error("Erro ao processar mensagem recebida:", error);
            }
        });

        // Rotinas automáticas (sem alterações)
        setInterval(() => rastreamentoController.verificarRastreios(db), 300000);
        setInterval(() => envioController.enviarMensagensComRegras(db), 60000);
        
        // 8. Inicia o servidor HTTP em vez do app Express
        server.listen(PORT, () => {
            console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
            console.log(`🖥️  Acesse o painel em: http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error("❌ Falha fatal ao iniciar a aplicação:", error);
        process.exit(1);
    }
};

startApp();
