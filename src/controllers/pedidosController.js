// src/controllers/pedidosController.js
const pedidoService = require('../services/pedidoService');
const whatsappService = require('../services/whatsappService');

/**
 * Normaliza e valida um número de celular brasileiro, adicionando o 9º dígito se necessário.
 * @param {string} telefoneRaw 
 * @returns {string|null} Número no formato 55DDD9XXXXXXXX ou nulo se inválido.
 */
function normalizeTelefone(telefoneRaw) {
    if (!telefoneRaw) return null;
    let digitos = String(telefoneRaw).replace(/\D/g, '');

    if (digitos.startsWith('55')) {
        digitos = digitos.substring(2);
    }

    if (digitos.length < 10 || digitos.length > 11) {
        return null; 
    }

    const ddd = digitos.substring(0, 2);
    let numero = digitos.substring(2);

    if (numero.length === 8 && ['6','7','8','9'].includes(numero[0])) {
        numero = '9' + numero;
    }

    if (numero.length !== 9) {
        return null;
    }

    return `55${ddd}${numero}`;
}

// LÊ todos os pedidos (usado em uma rota GET)
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

// CRIA um novo pedido
exports.criarPedido = async (req, res) => {
    const db = req.db;
    const client = req.app.get('venomClient');
    const { nome, telefone, produto, codigoRastreio } = req.body;
    const telefoneNormalizado = normalizeTelefone(telefone);

    if (!telefoneNormalizado || !nome) {
        return res.status(400).json({ error: "Nome e um número de celular válido são obrigatórios." });
    }
    
    try {
        const pedidoExistente = await pedidoService.findPedidoByTelefone(db, telefoneNormalizado);
        if (pedidoExistente) {
            return res.status(409).json({ error: `Este número (${telefoneNormalizado}) já está cadastrado.` });
        }
        
        const pedidoCriado = await pedidoService.criarPedido(db, { ...req.body, telefone: telefoneNormalizado }, client);
        
        res.status(201).json({
            message: "Pedido criado com sucesso!",
            data: pedidoCriado
        });
    } catch (error) {
        console.error("Erro ao criar pedido:", error.message);
        res.status(500).json({ error: "Erro interno no servidor ao criar pedido." });
    }
};

// ATUALIZA um pedido
exports.atualizarPedido = async (req, res) => {
    const db = req.db;
    const { id } = req.params;
    const dados = req.body;

    if (dados.telefone) {
        dados.telefone = normalizeTelefone(dados.telefone);
        if (!dados.telefone) {
            return res.status(400).json({ error: "O número de telefone para atualização é inválido." });
        }
    }

    try {
        const result = await pedidoService.updateCamposPedido(db, id, dados);
        if (result.changes === 0) return res.status(404).json({ error: `Pedido com ID ${id} não encontrado.` });
        res.json({ message: `Pedido com ID ${id} atualizado com sucesso.` });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
};

// APAGA um pedido
exports.deletarPedido = (req, res) => {
    const db = req.db;
    const { id } = req.params;
    db.run('DELETE FROM pedidos WHERE id = ?', id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: `Pedido com ID ${id} não encontrado.` });
        res.json({ message: `Pedido com ID ${id} deletado com sucesso.` });
    });
};

// BUSCA O HISTÓRICO de mensagens (usado em uma rota GET)
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

// ATUALIZA a foto de perfil
exports.atualizarFotoDoPedido = async (req, res) => {
    const db = req.db;
    const { id } = req.params;
    const client = req.app.get('venomClient');

    if (!client) {
        return res.status(500).json({ error: "Cliente WhatsApp não está conectado." });
    }

    try {
        const pedido = await pedidoService.getPedidoById(db, id);
        if (!pedido) {
            return res.status(404).json({ error: "Pedido não encontrado." });
        }

        const fotoUrl = await whatsappService.getProfilePicUrl(pedido.telefone, client);
        if (!fotoUrl) {
            return res.status(404).json({ error: "Nenhuma foto de perfil foi encontrada para este contato." });
        }

        await pedidoService.updateCamposPedido(db, id, { fotoPerfilUrl: fotoUrl });
        res.status(200).json({ message: "Foto de perfil atualizada com sucesso!", data: { fotoUrl } });
    } catch (error) {
        console.error("Erro ao tentar atualizar a foto do pedido:", error);
        res.status(500).json({ error: "Falha ao buscar ou atualizar a foto de perfil." });
    }
};

// MARCA mensagens como lidas
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