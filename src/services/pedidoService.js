// --- CORREÇÃO: Importando o whatsappService ---
const whatsappService = require('./whatsappService');

/**
 * NORMALIZADOR DE TELEFONE DEFINITIVO (trata o 9º dígito)
 * Converte qualquer número de celular brasileiro para o formato padrão 55DDD9XXXXXXXX.
 * @param {string} telefoneRaw O número em qualquer formato.
 * @returns {string|null} O número 100% normalizado ou nulo se for inválido.
 */
function normalizeTelefone(telefoneRaw) {
    if (!telefoneRaw) return null;
    // 1. Remove tudo que não for dígito
    let digitos = String(telefoneRaw).replace(/\D/g, '');

    // 2. Se tiver '55' no início, remove para analisar o número local
    if (digitos.startsWith('55')) {
        digitos = digitos.substring(2);
    }

    // 3. Um número local válido no Brasil tem 10 (DDD+8) ou 11 (DDD+9) dígitos
    if (digitos.length < 10 || digitos.length > 11) {
        return null; // Formato inválido
    }

    const ddd = digitos.substring(0, 2);
    let numeroBase = digitos.substring(2);

    // 4. A MÁGICA: Se o número base tem 8 dígitos e é um celular, adiciona o '9'
    if (numeroBase.length === 8 && ['6','7','8','9'].includes(numeroBase[0])) {
        numeroBase = '9' + numeroBase;
    }

    // 5. Se o número final não tem 9 dígitos, não é um celular válido
    if (numeroBase.length !== 9) {
        return null;
    }

    // 6. Retorna o número no formato canônico e garantido
    return `55${ddd}${numeroBase}`;
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
        // A partir de agora, a busca é simples, pois o número sempre será normalizado da mesma forma
        const telefoneNormalizado = normalizeTelefone(telefone);
        
        if (!telefoneNormalizado) {
            // Se o número de telefone de entrada for inválido, não há como encontrar.
            return resolve(null);
        }
        
        const sql = "SELECT * FROM pedidos WHERE telefone = ?";
        
        db.get(sql, [telefoneNormalizado], (err, row) => {
            if (err) {
                console.error(`Erro ao buscar pedido por telefone (normalizado) ${telefoneNormalizado}`, err);
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
    return new Promise((resolve, reject) => {
        const sqlInsert = `INSERT INTO historico_mensagens (pedido_id, mensagem, tipo_mensagem, origem) VALUES (?, ?, ?, ?)`;
        
        db.run(sqlInsert, [pedidoId, mensagem, tipoMensagem, origem], function(err) {
            if (err) {
                console.error(`Erro ao adicionar ao histórico do pedido ${pedidoId}`, err);
                return reject(err);
            }

            // --- NOVO: Atualiza a tabela de pedidos com a última mensagem ---
            const dataAgora = new Date().toISOString();
            const sqlUpdate = `UPDATE pedidos SET ultimaMensagem = ?, dataUltimaMensagem = ? WHERE id = ?`;
            
            db.run(sqlUpdate, [mensagem, dataAgora, pedidoId], (updateErr) => {
                if (updateErr) {
                    // Mesmo se esta atualização falhar, não quebra a operação principal
                    console.error(`Erro ao atualizar ultimaMensagem para o pedido ${pedidoId}`, updateErr);
                }
                resolve({ id: this.lastID });
            });
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
const criarPedido = (db, dadosPedido, client) => {
    return new Promise(async (resolve, reject) => {
        const { nome, telefone, produto, codigoRastreio } = dadosPedido;
        const telefoneValidado = normalizeTelefone(telefone);

        if (!telefoneValidado || !nome) {
            return reject(new Error("Nome e um número de celular válido são obrigatórios."));
        }

        let fotoUrl = null;
        if (client) { // Só tenta buscar a foto se o client do venom for passado
            try {
                const contatoId = `${telefoneValidado}@c.us`;
                console.log(`[CRIAR PEDIDO] Buscando foto para o contatoId: ${contatoId}`);
                fotoUrl = await client.getProfilePicFromServer(contatoId);
                console.log(`[CRIAR PEDIDO] Resultado da busca (fotoUrl):`, fotoUrl);
            } catch (e) {
                console.warn(`Não foi possível obter a foto para o novo contato ${telefoneValidado}.`);
                fotoUrl = null;
            }
        }
        
        const sql = 'INSERT INTO pedidos (nome, telefone, produto, codigoRastreio, fotoPerfilUrl) VALUES (?, ?, ?, ?, ?)';
        const params = [nome, telefoneValidado, produto || null, codigoRastreio || null, fotoUrl];
        
        db.run(sql, params, function (err) {
            if (err) return reject(err);
            resolve({
                id: this.lastID, nome, telefone: telefoneValidado, produto, codigoRastreio, fotoPerfilUrl: fotoUrl
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