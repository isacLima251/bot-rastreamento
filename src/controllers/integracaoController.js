// src/controllers/integracaoController.js
const pedidoService = require('../services/pedidoService');
const whatsappService = require('../services/whatsappService');

/**
 * Recebe um postback de uma plataforma externa (Braip, PayT, etc.) para criar um novo pedido.
 */
exports.receberPostback = async (req, res) => {
    // A instância do DB vem da requisição, injetada pela middleware
    const db = req.db;
    
    // Extrai os dados do corpo da requisição
    const { nome_cliente, celular_cliente, nome_produto } = req.body;

    // 1. Validação dos dados essenciais
    if (!nome_cliente || !celular_cliente) {
        console.warn('⚠️ [Integração] Recebida requisição sem nome ou celular do cliente.');
        return res.status(400).json({ error: "Dados insuficientes. 'nome_cliente' e 'celular_cliente' são obrigatórios." });
    }

    console.log(`✨ [Integração] Recebido novo pedido: ${nome_cliente}, Produto: ${nome_produto || 'Não informado'}`);

    try {
        // 2. Reutiliza a lógica de criação de pedido do nosso serviço
        // O pedidoService já lida com normalização de telefone, busca de foto, etc.
        const novoPedido = {
            nome: nome_cliente,
            telefone: celular_cliente, // O serviço irá normalizar o número
            produto: nome_produto,
            codigoRastreio: null // Integrações geralmente não têm rastreio imediato
        };

        const pedidoCriado = await pedidoService.criarPedido(db, novoPedido);
        
        // 3. Responde com sucesso
        res.status(201).json({
            message: "Pedido recebido e criado com sucesso!",
            data: pedidoCriado
        });

    } catch (error) {
        // 4. Tratamento de erro aprimorado
        // Verifica se o erro é de violação de constraint (telefone único)
        if (error.message && error.message.includes('SQLITE_CONSTRAINT: UNIQUE')) {
            console.warn(`[Integração] Tentativa de criar pedido com telefone já existente: ${celular_cliente}`);
            return res.status(409).json({ error: `O telefone '${celular_cliente}' já está cadastrado.` });
        }
        
        // Para outros erros, retorna um erro genérico
        console.error('❌ [Integração] Erro ao salvar pedido:', error.message);
        return res.status(500).json({ error: "Erro interno ao processar o pedido." });
    }
};