// src/controllers/pedidosController.js
const pedidoService = require('../services/pedidoService');
const whatsappService = require('../services/whatsappService');

/**
 * Função de validação para números de telefone.
 */
const validarTelefone = (telefone) => {
    if (!telefone) return null;
    const telefoneLimpo = String(telefone).replace(/\D/g, ''); // Remove tudo que não for dígito
    if (telefoneLimpo.length >= 10 && telefoneLimpo.length <= 13) {
        return telefoneLimpo;
    }
    return null;
};

// --- Funções do Controlador ---

// LÊ todos os pedidos, agora com filtro de busca
exports.listarPedidos = (req, res) => {
    const db = req.db;
    const { busca } = req.query;

    let sql = "SELECT * FROM pedidos";
    const params = [];

    if (busca) {
        sql += " WHERE nome LIKE ? OR telefone LIKE ?";
        params.push(`%${busca}%`);
        params.push(`%${busca}%`);
    }

    sql += " ORDER BY id DESC";

    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({
            message: "Pedidos obtidos com sucesso",
            data: rows
        });
    });
};

// CRIA um novo pedido
exports.criarPedido = (req, res) => {
    const db = req.db;
    const { nome, telefone, produto, codigoRastreio } = req.body;

    const telefoneValidado = validarTelefone(telefone);
    if (!telefoneValidado) {
        return res.status(400).json({ error: "Número de telefone inválido." });
    }
    if (!nome) {
        return res.status(400).json({ error: "O nome do cliente é obrigatório." });
    }

    const sql = 'INSERT INTO pedidos (nome, telefone, produto, codigoRastreio) VALUES (?, ?, ?, ?)';
    const params = [nome, telefoneValidado, produto, codigoRastreio || null]; 

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({
            message: "Pedido criado com sucesso!",
            data: { id: this.lastID, ...req.body, telefone: telefoneValidado }
        });
    });
};

// ACTUALIZA um pedido existente
exports.atualizarPedido = (req, res) => {
    const db = req.db;
    const { id } = req.params;
    const { nome, telefone, produto, codigoRastreio, dataPostagem } = req.body;

    const fields = [];
    const params = [];

    if (telefone !== undefined) {
        const telefoneValidado = validarTelefone(telefone);
        if (!telefoneValidado) {
            return res.status(400).json({ error: "O número de telefone fornecido para atualização é inválido." });
        }
        fields.push("telefone = ?");
        params.push(telefoneValidado);
    }

    if (nome !== undefined) { fields.push("nome = ?"); params.push(nome); }
    if (produto !== undefined) { fields.push("produto = ?"); params.push(produto); }
    if (codigoRastreio !== undefined) { fields.push("codigoRastreio = ?"); params.push(codigoRastreio); }
    if (dataPostagem !== undefined) { fields.push("dataPostagem = ?"); params.push(dataPostagem); }

    if (fields.length === 0) {
        return res.status(400).json({ error: "Nenhum campo válido para atualizar foi fornecido." });
    }

    const sql = `UPDATE pedidos SET ${fields.join(', ')} WHERE id = ?`;
    params.push(id);

    db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: `Pedido com ID ${id} não encontrado.` });
        res.json({ message: `Pedido com ID ${id} atualizado com sucesso.` });
    });
};

// APAGA um pedido
exports.deletarPedido = (req, res) => {
    const db = req.db;
    const { id } = req.params;
    const sql = 'DELETE FROM pedidos WHERE id = ?';
    db.run(sql, id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: `Pedido com ID ${id} não encontrado.` });
        res.json({ message: `Pedido com ID ${id} deletado com sucesso.` });
    });
};

// BUSCA O HISTÓRICO de mensagens de um pedido
exports.getHistoricoDoPedido = async (req, res) => {
    const db = req.db;
    const { id } = req.params;
    try {
        const historico = await pedidoService.getHistoricoPorPedidoId(db, id);
        res.json({
            message: `Histórico para o pedido #${id} obtido com sucesso.`,
            data: historico
        });
    } catch (error) {
        res.status(500).json({ error: "Falha ao buscar o histórico do pedido." });
    }
};

// ENVIA uma mensagem manualmente
exports.enviarMensagemManual = async (req, res) => {
    const db = req.db;
    const { id } = req.params; // ID do pedido
    const { mensagem } = req.body; // Mensagem que você escreveu

    if (!mensagem) {
        return res.status(400).json({ error: "O campo 'mensagem' é obrigatório." });
    }

    try {
        const pedido = await pedidoService.getPedidoById(db, id);
        if (!pedido) {
            return res.status(404).json({ error: "Pedido não encontrado." });
        }

        // Envia a mensagem via WhatsApp
        await whatsappService.enviarMensagem(pedido.telefone, mensagem);
        
        // Guarda a mensagem manual no histórico, especificando a origem como 'bot'
        await pedidoService.addMensagemHistorico(db, id, mensagem, 'manual', 'bot');

        res.status(200).json({ message: "Mensagem enviada e registada com sucesso!" });

    } catch (error) {
        console.error("Erro no envio manual:", error);
        res.status(500).json({ error: "Falha ao enviar a mensagem." });
    }
};
