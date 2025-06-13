// src/database/database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const DB_PATH = path.join(__dirname, '../../automaza.db');

const initDb = () => {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error("❌ Erro ao conectar ao banco de dados:", err.message);
                return reject(err);
            }
            console.log('✅ Conectado ao banco de dados SQLite.');

            db.serialize(() => {
                // Tabela de Pedidos
                db.run(`
                    CREATE TABLE IF NOT EXISTS pedidos (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        nome TEXT,
                        telefone TEXT NOT NULL UNIQUE,
                        produto TEXT,
                        codigoRastreio TEXT,
                        dataPostagem TEXT,
                        statusInterno TEXT,
                        ultimaAtualizacao TEXT,
                        ultimaLocalizacao TEXT,
                        mensagemUltimoStatus TEXT,
                        fotoPerfilUrl TEXT,
                        dataCriacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `, (err) => {
                    if (err) {
                        console.error("❌ Erro ao criar tabela 'pedidos':", err.message);
                        return reject(err);
                    }
                    console.log("✔️ Tabela 'pedidos' pronta.");

                    // --- ADICIONA A COLUNA 'mensagensNaoLidas' APÓS CRIAR A TABELA ---
                    db.run("ALTER TABLE pedidos ADD COLUMN mensagensNaoLidas INTEGER DEFAULT 0 NOT NULL;", (alterErr) => {
                        if (alterErr) {
                            // Se o erro for 'coluna duplicada', é esperado. Ignoramos.
                            if (alterErr.message.includes('duplicate column name')) {
                                console.log("✔️ Coluna 'mensagensNaoLidas' já existe.");
                            } else {
                                // Se for outro erro, ele é crítico.
                                console.error("❌ Erro ao adicionar coluna 'mensagensNaoLidas':", alterErr.message);
                                return reject(alterErr);
                            }
                        } else {
                            console.log("✔️ Coluna 'mensagensNaoLidas' adicionada com sucesso.");
                        }
                    });
                });

                // Tabela de Histórico
                db.run(`
                    CREATE TABLE IF NOT EXISTS historico_mensagens (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        pedido_id INTEGER NOT NULL,
                        mensagem TEXT NOT NULL,
                        tipo_mensagem TEXT,
                        origem TEXT NOT NULL,
                        data_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (pedido_id) REFERENCES pedidos (id) ON DELETE CASCADE
                    )
                `, (err) => {
                    if (err) {
                        console.error("❌ Erro ao criar tabela 'historico_mensagens':", err.message);
                        return reject(err);
                    }
                    console.log("✔️ Tabela 'historico_mensagens' pronta.");
                });

                // Resolve a promise aqui no final do serialize para garantir que tudo foi enfileirado
                resolve(db);
            });
        });
    });
};

module.exports = { initDb };