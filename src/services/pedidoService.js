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
 * Busca um pedido pelo número de telefone, tratando variações (com ou sem 55, etc.).
 * @param {object} db A instância do banco de dados.
 * @param {string} telefone O número de telefone do remetente (ex: 5582999991111).
 * @returns {Promise<object|null>} O pedido encontrado ou nulo.
 */
const findPedidoByTelefone = (db, telefone) => {
    return new Promise((resolve, reject) => {
        // Tenta encontrar uma correspondência exata primeiro
        db.get("SELECT * FROM pedidos WHERE telefone = ?", [telefone], (err, row) => {
            if (err) return reject(err);
            if (row) {
                // Encontrou uma correspondência exata, retorna imediatamente
                return resolve(row);
            }
            
            // Se não encontrou e o número tem o 55, tenta buscar sem ele
            if (telefone.startsWith('55') && telefone.length > 11) {
                const telefoneSem55 = telefone.substring(2);
                db.get("SELECT * FROM pedidos WHERE telefone = ?", [telefoneSem55], (err, row) => {
                    if (err) return reject(err);
                    resolve(row);
                });
            } else {
                // Se o número não tem 55, tenta buscar com ele
                db.get("SELECT * FROM pedidos WHERE telefone = ?", [`55${telefone}`], (err, row) => {
                     if (err) return reject(err);
                     resolve(row);
                });
            }
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
 * Adiciona uma nova entrada ao histórico de mensagens.
 * @param {object} db A instância do banco de dados.
 * @param {number} pedidoId O ID do pedido.
 * @param {string} mensagem O conteúdo da mensagem.
 * @param {string} tipoMensagem O tipo da mensagem ('manual', 'postado', etc.).
 * @param {string} origem A origem da mensagem ('bot' ou 'cliente').
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

module.exports = {
    getAllPedidos,
    getPedidoById,
    findPedidoByTelefone,
    updateCamposPedido,
    addMensagemHistorico,
    getHistoricoPorPedidoId
};
