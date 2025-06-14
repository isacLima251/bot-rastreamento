// No topo do server.js
require('dotenv').config();
const express = require('express');
const venom = require('venom-bot');
const http = require('http');
const { WebSocketServer } = require('ws');
const { initDb } = require('./src/database/database.js');

// --- Importações dos controllers e serviços ---
const pedidosController = require('./src/controllers/pedidosController');
const envioController = require('./src/controllers/envioController');
const rastreamentoController = require('./src/controllers/rastreamentoController');
const whatsappService = require('./src/services/whatsappService');
const integracaoController = require('./src/controllers/integracaoController');
const pedidoService = require('./src/services/pedidoService');


// --- GERENCIAMENTO DE ESTADO ---
let whatsappStatus = 'DISCONNECTED';
let qrCodeData = null;
let venomClient = null;
let botInfo = null;

const app = express();
const PORT = 3000;
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const clients = new Set();

// --- Funções de Broadcast e WebSocket ---
function broadcast(data) {
    const jsonData = JSON.stringify(data);
    for (const client of clients) {
        if (client.readyState === client.OPEN) {
            client.send(jsonData);
        }
    }
}

function broadcastStatus(newStatus, data = {}) {
    whatsappStatus = newStatus;
    qrCodeData = data.qrCode || null;
    console.log(`Status do WhatsApp alterado para: ${newStatus}`);
    broadcast({ type: 'status_update', status: newStatus, ...data });
}

wss.on('connection', (ws) => {
    console.log('🔗 Novo painel conectado via WebSocket.');
    clients.add(ws);
    ws.send(JSON.stringify({ type: 'status_update', status: whatsappStatus, qrCode: qrCodeData }));
    ws.on('close', () => clients.delete(ws));
});

// --- Lógica de Conexão e Desconexão do WhatsApp ---
async function connectToWhatsApp() {
    if (venomClient || whatsappStatus === 'CONNECTING' || whatsappStatus === 'CONNECTED') {
        console.warn('⚠️ Tentativa de conectar com sessão já ativa ou em andamento.');
        return;
    }
    console.log('Iniciando conexão com o WhatsApp...');
    broadcastStatus('CONNECTING');

    venom.create(
        {
            session: 'automaza-bot',
            useChrome: false,
            headless: 'new',
            browserArgs: ['--no-sandbox', '--disable-setuid-sandbox']
        },
        (base64Qr, asciiQR, attempts, urlCode) => {
            console.log('QR Code recebido. Envie para o painel.');
            broadcastStatus('QR_CODE', { qrCode: base64Qr });
        },
        (statusSession, session) => {
            console.log('[Status da Sessão Durante Conexão]', statusSession);
        }
    )
    .then((client) => {
        console.log('✅ Cliente Venom criado com SUCESSO. Iniciando rotinas...');
        const hostDevice = client.getHostDevice();

        // --- ETAPA DE DEPURAÇÃO ---
        console.log('[DEPURAÇÃO] Estrutura do objeto hostDevice:', hostDevice);

        // --- CÓDIGO CORRIGIDO E MAIS SEGURO ---
        // Verificamos se hostDevice e hostDevice.wid existem antes de tentar acessá-los
        if (hostDevice && hostDevice.wid) {
            const numeroBot = hostDevice.wid.user;
            const nomeBot = hostDevice.pushname;
            botInfo = { numero: numeroBot, nome: nomeBot };

            client.getProfilePicFromServer(hostDevice.wid._serialized)
                .then(url => {
                    if (botInfo) botInfo.fotoUrl = url;
                })
                .catch(err => {
                    console.warn("Não foi possível obter a foto de perfil do próprio bot.");
                    if (botInfo) botInfo.fotoUrl = null;
                })
                .finally(() => {
                    start(client);
                    broadcastStatus('CONNECTED', { botInfo });
                });
        } else {
            // Se a estrutura for inesperada, continuamos sem os dados do bot, mas sem quebrar
            console.error('❌ Não foi possível obter os dados do dispositivo host (hostDevice.wid está undefined). Continuando sem eles.');
            start(client);
            broadcastStatus('CONNECTED');
        }
    })
    .catch((erro) => {
        console.error('❌ Erro DETALHADO ao criar cliente Venom:', erro);
        broadcastStatus('DISCONNECTED');
        venomClient = null;
    });
}

async function disconnectFromWhatsApp() {
    if (venomClient) {
        await venomClient.logout();
        await venomClient.close();
        venomClient = null;
        broadcastStatus('DISCONNECTED');
        console.log('🔌 Cliente WhatsApp desconectado.');
    }
}

// --- Função 'start' que configura as rotinas do bot ---
function start(client) {
    venomClient = client;
    whatsappService.iniciarWhatsApp(client);
    
    client.onMessage(async (message) => {
        console.log('\n--- [onMessage] Evento de mensagem recebido! ---');
        if (message.isGroupMsg || !message.body || message.from === 'status@broadcast') {
            console.log('[onMessage] Mensagem ignorada (grupo, sem corpo ou status).'); 
            return;
        }
        const telefoneCliente = message.from.replace('@c.us', '');
        console.log(`[onMessage] Mensagem recebida de: ${telefoneCliente}`);
        console.log(`[onMessage] Conteúdo: "${message.body}"`);
        
        try {
            const db = app.get('db');
            let pedido = await pedidoService.findPedidoByTelefone(db, telefoneCliente);
            
            if (!pedido) {
                console.log(`[onMessage] AVISO: Nenhum pedido encontrado para ${telefoneCliente}. Criando novo contato...`);
                const nomeContato = message.notifyName || message.pushName || telefoneCliente;
                const novoPedidoData = {
                    nome: nomeContato,
                    telefone: telefoneCliente,
                    produto: 'Novo Contato (via WhatsApp)',
                    codigoRastreio: null
                };
                pedido = await pedidoService.criarPedido(db, novoPedidoData, client);
                console.log(`[onMessage] SUCESSO! Novo contato criado: ${pedido.nome} (ID: ${pedido.id})`);
                broadcast({ type: 'novo_contato', pedido });
            } else {
                await pedidoService.incrementarNaoLidas(db, pedido.id);
            }
            await pedidoService.addMensagemHistorico(db, pedido.id, message.body, 'recebida', 'cliente');
            console.log(`[onMessage] Mensagem de "${message.body}" salva no histórico do pedido ID ${pedido.id}.`);
            broadcast({ type: 'nova_mensagem', pedidoId: pedido.id });
        } catch (error) {
            console.error("[onMessage] Erro CRÍTICO ao processar mensagem recebida:", error);
        }
    });
    
    console.log('✅ Cliente WhatsApp iniciado e pronto para receber mensagens.');
}

// --- Função Principal da Aplicação ---
const startApp = async () => {
    try {
        const db = await initDb();
        app.set('db', db);
        console.log("Banco de dados pronto.");

        app.use(express.json());
        app.use(express.static('public'));
        app.use((req, res, next) => { req.db = db; next(); });

        console.log("✔️ Registrando rotas da API...");
        app.get('/api/pedidos', pedidosController.listarPedidos);
        app.post('/api/pedidos', pedidosController.criarPedido);
        app.put('/api/pedidos/:id', pedidosController.atualizarPedido);
        app.delete('/api/pedidos/:id', pedidosController.deletarPedido);
        app.get('/api/pedidos/:id/historico', pedidosController.getHistoricoDoPedido);
        app.post('/api/pedidos/:id/enviar-mensagem', pedidosController.enviarMensagemManual);
        app.post('/api/pedidos/:id/atualizar-foto', pedidosController.atualizarFotoDoPedido);
        app.put('/api/pedidos/:id/marcar-como-lido', pedidosController.marcarComoLido);
        app.post('/api/integracao/postback', integracaoController.receberPostback);

        // Rotas para controle do WhatsApp
        app.get('/api/whatsapp/status', (req, res) => {
            res.json({ status: whatsappStatus, qrCode: qrCodeData });
        });
        app.post('/api/whatsapp/connect', (req, res) => {
            connectToWhatsApp();
            res.status(202).json({ message: "Processo de conexão iniciado." });
        });
        app.post('/api/whatsapp/disconnect', async (req, res) => {
            await disconnectFromWhatsApp();
            res.status(200).json({ message: "Desconectado com sucesso." });
        });

        // Rotinas automáticas
        setInterval(() => {
            if (venomClient) rastreamentoController.verificarRastreios(db, venomClient)
        }, 300000);
        setInterval(() => {
            if (venomClient) envioController.enviarMensagensComRegras(db, venomClient)
        }, 60000);
        
        server.listen(PORT, () => {
            console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error("❌ Falha fatal ao iniciar a aplicação:", error);
        process.exit(1);
    }
};

startApp();