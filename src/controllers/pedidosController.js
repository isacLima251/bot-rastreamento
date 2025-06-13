// src/controllers/pedidosController.js
const pedidoService = require('../services/pedidoService');
const whatsappService = require('../services/whatsappService');

/**
 * Função de validação para números de telefone.
 */
const validarTelefone = (telefone) => {
    if (!telefone) return null;
    const telefoneLimpo = String(telefone).replace(/\D/g, '');
    if (telefoneLimpo.length >= 10 && telefoneLimpo.length <= 13) {
        return telefoneLimpo;
    }
    return null;
};

// --- Funções do Controlador ---

// LÊ todos os pedidos
exports.listarPedidos = (req, res) => {
    const db = req.db;
    const { busca } = req.query;
    let sql = "SELECT * FROM pedidos ORDER BY id DESC";
    let params = [];
    if (busca) {
        sql = "SELECT * FROM pedidos WHERE nome LIKE ? OR telefone LIKE ? ORDER BY id DESC";
        params = [`%${busca}%`, `%${busca}%`];
    }
    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
};

// CRIA um novo pedido e tenta buscar a foto
exports.criarPedido = async (req, res) => {
    const db = req.db;
    const { nome, telefone, produto, codigoRastreio } = req.body;

    const telefoneValidado = validarTelefone(telefone);
    if (!telefoneValidado || !nome) {
        return res.status(400).json({ error: "Nome e telefone são obrigatórios e válidos." });
    }

    try {
        const pedidoExistente = await pedidoService.findPedidoByTelefone(db, telefoneValidado);
        if (pedidoExistente) {
            return res.status(409).json({ error: `Este número (${telefoneValidado}) já está cadastrado.` });
        }

        const fotoUrl = await whatsappService.getProfilePicUrl(telefoneValidado);
        const sql = 'INSERT INTO pedidos (nome, telefone, produto, codigoRastreio, fotoPerfilUrl) VALUES (?, ?, ?, ?, ?)';
        const params = [nome, telefoneValidado, produto, codigoRastreio || null, fotoUrl];
        
        db.run(sql, params, function (err) {
            if (err) return res.status(500).json({ error: "Falha ao inserir pedido no banco de dados." });
            
            console.log(`✅ Pedido para ${nome} criado com sucesso.${fotoUrl ? ' Foto de perfil encontrada.' : ''}`);
            res.status(201).json({
                message: "Pedido criado com sucesso!",
                data: { id: this.lastID }
            });
        });
    } catch (error) {
        console.error("Erro ao criar pedido:", error);
        res.status(500).json({ error: "Erro interno no servidor." });
    }
};

// ACTUALIZA um pedido
exports.atualizarPedido = (req, res) => {
    const db = req.db;
    const { id } = req.params;
    const dados = req.body;

    // Remove o telefone dos dados para validar separadamente
    const { telefone, ...outrosCampos } = dados;
    
    const fieldsToUpdate = { ...outrosCampos };
    if (telefone !== undefined) {
        const telefoneValidado = validarTelefone(telefone);
        if (!telefoneValidado) {
            return res.status(400).json({ error: "O número de telefone para atualização é inválido." });
        }
        fieldsToUpdate.telefone = telefoneValidado;
    }

    pedidoService.updateCamposPedido(db, id, fieldsToUpdate)
        .then(result => {
            if (result.changes === 0) return res.status(404).json({ error: `Pedido com ID ${id} não encontrado.` });
            res.json({ message: `Pedido com ID ${id} atualizado com sucesso.` });
        })
        .catch(err => res.status(500).json({ error: err.message }));
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
        res.json({ data: historico });
    } catch (error) {
        res.status(500).json({ error: "Falha ao buscar o histórico do pedido." });
    }
};


// ENVIA uma mensagem manualmente
exports.enviarMensagemManual = async (req, res) => {
    const db = req.db;
    const { id } = req.params;
    const { mensagem } = req.body;

    if (!mensagem) {
        return res.status(400).json({ error: "O campo 'mensagem' é obrigatório." });
    }

    try {
        const pedido = await pedidoService.getPedidoById(db, id);
        if (!pedido) return res.status(404).json({ error: "Pedido não encontrado." });

        await whatsappService.enviarMensagem(pedido.telefone, mensagem);
        await pedidoService.addMensagemHistorico(db, id, mensagem, 'manual', 'bot');
        res.status(200).json({ message: "Mensagem enviada com sucesso!" });

    } catch (error) {
        console.error("Erro no envio manual:", error);
        res.status(500).json({ error: "Falha ao enviar a mensagem." });
    }
};

exports.atualizarFotoDoPedido = async (req, res) => {
    const db = req.db;
    const { id } = req.params;

    try {
        const pedido = await pedidoService.getPedidoById(db, id);
        if (!pedido) {
            return res.status(404).json({ error: "Pedido não encontrado." });
        }

        console.log(`Buscando foto de perfil para o telefone ${pedido.telefone}...`);
        const fotoUrl = await whatsappService.getProfilePicUrl(pedido.telefone);

        if (!fotoUrl) {
            console.log("Nenhuma foto de perfil pública foi encontrada.");
            return res.status(404).json({ error: "Nenhuma foto de perfil pública encontrada para este contato." });
        }

        await pedidoService.updateCamposPedido(db, id, { fotoPerfilUrl: fotoUrl });

        console.log(`✅ Foto de perfil do pedido ${id} atualizada.`);
        res.status(200).json({
            message: "Foto de perfil atualizada com sucesso!",
            data: { fotoUrl: fotoUrl }
        });

    } catch (error) {
        console.error("Erro ao tentar atualizar a foto do pedido:", error);
        res.status(500).json({ error: "Falha ao buscar ou atualizar a foto de perfil." });
    }
};

exports.marcarComoLido = async (req, res) => {
    const db = req.db;
    const { id } = req.params;
    try {
        await pedidoService.marcarComoLido(db, id);
        res.status(200).json({ message: "Mensagens marcadas como lidas." });
    } catch (error) {
        res.status(500).json({ error: "Falha ao marcar como lido." });
    }
};