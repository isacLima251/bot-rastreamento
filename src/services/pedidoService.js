// --- CORREÇÃO: Importando o whatsappService ---
const whatsappService = require('./whatsappService');

// --- CORREÇÃO: Adicionando a função de ajuda que faltava ---
/**
 * Normaliza um número de telefone para o formato internacional brasileiro (55 + DDD + Número).
 */
function normalizeTelefone(telefoneRaw) {
    if (!telefoneRaw) return '';
    const digitos = String(telefoneRaw).replace(/\D/g, '');
    if (digitos.startsWith('55') && (digitos.length === 12 || digitos.length === 13)) {
        return digitos;
    }
    if (digitos.length === 10 || digitos.length === 11) {
        return `55${digitos}`;
    }
    return digitos;
}


/**
 * Busca todos os pedidos do banco de dados.
 */
const getAllPedidos = (db) => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM pedidos ORDER BY id DESC", [], (err, rows) => {
            if (err) {
                console.error("Erro ao buscar todos os pedidos", err);
                return reject(err);
            }
            resolve(rows);
        });
    });
};

/**
 * Busca um único pedido pelo seu ID.
 */
const getPedidoById = (db, id) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM pedidos WHERE id = ?", [id], (err, row) => {
            if (err) {
                console.error(`Erro ao buscar pedido por ID ${id}`, err);
                return reject(err);
            }
            resolve(row);
        });
    });
};

/**
 * Busca um pedido pelo número de telefone.
 */
const findPedidoByTelefone = (db, telefone) => {
    return new Promise((resolve, reject) => {
        const telefoneNormalizado = normalizeTelefone(telefone);
        const telefoneCom55 = telefoneNormalizado.startsWith('55') ? telefoneNormalizado : `55${telefoneNormalizado}`;
        const telefoneSem55 = telefoneNormalizado.startsWith('55') ? telefoneNormalizado.substring(2) : telefoneNormalizado;
        
        const sql = "SELECT * FROM pedidos WHERE telefone = ? OR telefone = ?";
        
        db.get(sql, [telefoneCom55, telefoneSem55], (err, row) => {
            if (err) {
                console.error(`Erro ao buscar pedido por telefone ${telefone}`, err);
                return reject(err);
            }
            resolve(row);
        });
    });
};

/**
 * Atualiza um ou mais campos de um pedido específico.
 */
const updateCamposPedido = (db, pedidoId, campos) => {
    if (!campos || Object.keys(campos).length === 0) {
        return Promise.resolve({ changes: 0 });
    }
    const fields = Object.keys(campos).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(campos), pedidoId];
    const sql = `UPDATE pedidos SET ${fields} WHERE id = ?`;

    return new Promise((resolve, reject) => {
        db.run(sql, values, function(err) {
            if (err) {
                console.error(`Erro ao atualizar pedido ${pedidoId}`, err);
                return reject(err);
            }
            resolve({ changes: this.changes });
        });
    });
};

/**
 * Adiciona uma nova entrada ao histórico de mensagens.
 */
const addMensagemHistorico = (db, pedidoId, mensagem, tipoMensagem, origem) => {
    const sql = `INSERT INTO historico_mensagens (pedido_id, mensagem, tipo_mensagem, origem) VALUES (?, ?, ?, ?)`;
    return new Promise((resolve, reject) => {
        db.run(sql, [pedidoId, mensagem, tipoMensagem, origem], function(err) {
            if (err) {
                console.error(`Erro ao adicionar ao histórico do pedido ${pedidoId}`, err);
                return reject(err);
            }
            resolve({ id: this.lastID });
        });
    });
};

/**
 * Busca o histórico de mensagens de um pedido específico.
 */
const getHistoricoPorPedidoId = (db, pedidoId) => {
    const sql = `SELECT * FROM historico_mensagens WHERE pedido_id = ? ORDER BY data_envio ASC`;
    return new Promise((resolve, reject) => {
        db.all(sql, [pedidoId], (err, rows) => {
            if (err) {
                console.error(`Erro ao buscar histórico do pedido ${pedidoId}`, err);
                return reject(err);
            }
            resolve(rows);
        });
    });
};

/**
 * Incrementa o contador de mensagens não lidas para um pedido.
 */
const incrementarNaoLidas = (db, pedidoId) => {
    return new Promise((resolve, reject) => {
        const sql = 'UPDATE pedidos SET mensagensNaoLidas = mensagensNaoLidas + 1 WHERE id = ?';
        db.run(sql, [pedidoId], function (err) {
            if (err) {
                console.error("Erro ao incrementar mensagens não lidas:", err.message);
                return reject(err);
            }
            resolve({ changes: this.changes });
        });
    });
};

/**
 * Zera o contador de mensagens não lidas para um pedido.
 */
const marcarComoLido = (db, pedidoId) => {
    return new Promise((resolve, reject) => {
        const sql = 'UPDATE pedidos SET mensagensNaoLidas = 0 WHERE id = ?';
        db.run(sql, [pedidoId], function (err) {
            if (err) {
                console.error("Erro ao marcar mensagens como lidas:", err.message);
                return reject(err);
            }
            resolve({ changes: this.changes });
        });
    });
};

/**
 * Cria um novo pedido no banco de dados.
 */
const criarPedido = (db, dadosPedido) => {
    return new Promise(async (resolve, reject) => {
        const { nome, telefone, produto, codigoRastreio } = dadosPedido;

        const telefoneValidado = normalizeTelefone(telefone);
        if (!telefoneValidado || !nome) {
            return reject(new Error("Nome e telefone são obrigatórios e válidos."));
        }

        const fotoUrl = await whatsappService.getProfilePicUrl(telefoneValidado);
        
        const sql = 'INSERT INTO pedidos (nome, telefone, produto, codigoRastreio, fotoPerfilUrl) VALUES (?, ?, ?, ?, ?)';
        const params = [nome, telefoneValidado, produto || null, codigoRastreio || null, fotoUrl];
        
        db.run(sql, params, function (err) {
            if (err) {
                return reject(err);
            }
            
            resolve({
                id: this.lastID,
                nome,
                telefone: telefoneValidado,
                produto,
                codigoRastreio,
                fotoPerfilUrl: fotoUrl
            });
        });
    });
};

module.exports = {
    getAllPedidos,
    getPedidoById,
    findPedidoByTelefone,
    updateCamposPedido,
    addMensagemHistorico,
    getHistoricoPorPedidoId,
    incrementarNaoLidas,
    marcarComoLido,
    criarPedido,
};