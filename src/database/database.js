// src/database/database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const DB_PATH = path.join(__dirname, '../../automaza.db');

const initDb = () => {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error("Erro ao conectar ao banco de dados", err.message);
                return reject(err);
            }
            console.log('✅ Conectado ao banco de dados SQLite.');

            db.serialize(() => {
                db.run(`
                    CREATE TABLE IF NOT EXISTS pedidos (
                        id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT, telefone TEXT NOT NULL, 
                        produto TEXT, codigoRastreio TEXT, dataPostagem TEXT, statusInterno TEXT,
                        ultimaAtualizacao TEXT, ultimaLocalizacao TEXT, mensagemUltimoStatus TEXT,
                        dataCriacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `, (err) => { if (err) return reject(err); console.log("✔️ Tabela 'pedidos' pronta."); });

                // TABELA DE HISTÓRICO ACTUALIZADA
                db.run(`
                    CREATE TABLE IF NOT EXISTS historico_mensagens (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        pedido_id INTEGER NOT NULL,
                        mensagem TEXT NOT NULL,
                        tipo_mensagem TEXT,
                        origem TEXT NOT NULL, -- 'bot' ou 'cliente'
                        data_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (pedido_id) REFERENCES pedidos (id) ON DELETE CASCADE
                    )
                `, (err) => {
                    if (err) return reject(err);
                    console.log("✔️ Tabela 'historico_mensagens' pronta.");
                    resolve(db);
                });
            });
        });
    });
};

module.exports = { initDb };
