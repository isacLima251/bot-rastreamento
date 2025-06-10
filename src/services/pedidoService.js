// src/services/pedidoService.js

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
 * Actualiza um ou mais campos de um pedido específico no banco de dados.
 * @param {object} db A instância do banco de dados.
 * @param {number} pedidoId O ID do pedido a ser actualizado.
 * @param {object} campos O objeto com os campos e valores a serem actualizados.
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
                console.error(`Erro ao actualizar pedido ${pedidoId}`, err);
                return reject(err);
            }
            resolve({ changes: this.changes });
        });
    });
};

/**
 * Adiciona uma nova entrada ao histórico de mensagens de um pedido.
 * @param {object} db A instância do banco de dados.
 * @param {number} pedidoId O ID do pedido.
 * @param {string} mensagem O conteúdo da mensagem.
 * @param {string} tipoStatus O tipo da mensagem (ex: 'manual', 'postado').
 * @returns {Promise<{id: number}>}
 */
const addMensagemHistorico = (db, pedidoId, mensagem, tipoStatus) => {
    const sql = `INSERT INTO historico_mensagens (pedido_id, mensagem, tipo_status) VALUES (?, ?, ?)`;
    return new Promise((resolve, reject) => {
        db.run(sql, [pedidoId, mensagem, tipoStatus], function(err) {
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

module.exports = {
    getAllPedidos,
    getPedidoById,
    updateCamposPedido,
    addMensagemHistorico,
    getHistoricoPorPedidoId
};
