/**
 * Busca todos os pedidos do banco de dados.
 * @param {object} db A instância do banco de dados.
 * @returns {Promise<Array>} Uma lista de todos os pedidos.
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
 * @param {object} db A instância do banco de dados.
 * @param {number} id O ID do pedido.
 * @returns {Promise<object|null>} O pedido encontrado ou nulo.
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
 * Busca um pedido pelo número de telefone, tratando variações (com ou sem 55).
 * @param {object} db A instância do banco de dados.
 * @param {string} telefone O número de telefone.
 * @returns {Promise<object|null>} O pedido encontrado ou nulo.
 */
const findPedidoByTelefone = (db, telefone) => {
    return new Promise((resolve, reject) => {
        const telefoneCom55 = telefone.startsWith('55') ? telefone : `55${telefone}`;
        const telefoneSem55 = telefone.startsWith('55') ? telefone.substring(2) : telefone;
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
 * @param {object} db A instância do banco de dados.
 * @param {number} pedidoId O ID do pedido.
 * @param {object} campos O objeto com os campos e valores a serem atualizados.
 * @returns {Promise<{changes: number}>}
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
 * @param {object} db A instância do banco de dados.
 * @param {number} pedidoId O ID do pedido.
 * @param {string} mensagem O conteúdo da mensagem.
 * @param {string} tipoMensagem O tipo da mensagem ('manual', 'postado', etc.).
 * @param {string} origem A origem da mensagem ('bot' ou 'cliente').
 * @returns {Promise<{id: number}>}
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
 * @param {object} db A instância do banco de dados.
 * @param {number} pedidoId O ID do pedido.
 * @returns {Promise<Array>}
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
 * @param {object} db A instância do banco de dados.
 * @param {number} pedidoId O ID do pedido.
 * @returns {Promise<{changes: number}>}
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
 * @param {object} db A instância do banco de dados.
 * @param {number} pedidoId O ID do pedido.
 * @returns {Promise<{changes: number}>}
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

module.exports = {
    getAllPedidos,
    getPedidoById,
    findPedidoByTelefone,
    updateCamposPedido,
    addMensagemHistorico,
    getHistoricoPorPedidoId,
    incrementarNaoLidas,
    marcarComoLido
};