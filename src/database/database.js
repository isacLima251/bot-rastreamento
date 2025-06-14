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

                    // Adiciona a coluna 'mensagensNaoLidas'
                    db.run("ALTER TABLE pedidos ADD COLUMN mensagensNaoLidas INTEGER DEFAULT 0 NOT NULL;", (alterErr) => {
                        if (alterErr && !alterErr.message.includes('duplicate column')) {
                            console.error("❌ Erro ao adicionar coluna 'mensagensNaoLidas':", alterErr.message);
                        } else if (!alterErr) {
                            console.log("✔️ Coluna 'mensagensNaoLidas' adicionada.");
                        }
                    });

                    // --- NOVO: Adiciona as colunas para 'ultimaMensagem' ---
                    db.run("ALTER TABLE pedidos ADD COLUMN ultimaMensagem TEXT;", (alterErr) => {
                        if (alterErr && !alterErr.message.includes('duplicate column')) {
                            console.error("❌ Erro ao adicionar coluna 'ultimaMensagem':", alterErr.message);
                        } else if (!alterErr) {
                            console.log("✔️ Coluna 'ultimaMensagem' adicionada.");
                        }
                    });

                    db.run("ALTER TABLE pedidos ADD COLUMN dataUltimaMensagem DATETIME;", (alterErr) => {
                        if (alterErr && !alterErr.message.includes('duplicate column')) {
                            console.error("❌ Erro ao adicionar coluna 'dataUltimaMensagem':", alterErr.message);
                        } else if (!alterErr) {
                            console.log("✔️ Coluna 'dataUltimaMensagem' adicionada.");
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

                resolve(db);
            });
        });
    });
};

module.exports = { initDb };