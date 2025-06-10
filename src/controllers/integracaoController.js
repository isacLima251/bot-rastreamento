// src/controllers/integracaoController.js
const db = require('../database/database.js');

// Esta função irá criar um pedido vindo de uma plataforma externa
exports.receberPostback = (req, res) => {
    // A Braip/PayT vai enviar os dados do cliente no corpo (body) da requisição
    const { nome_cliente, celular_cliente, nome_produto } = req.body;

    // Validação mínima para garantir que temos os dados essenciais
    if (!nome_cliente || !celular_cliente) {
        console.warn('⚠️ Recebida integração sem nome ou celular do cliente.');
        return res.status(400).json({ error: "Dados insuficientes. 'nome_cliente' e 'celular_cliente' são obrigatórios." });
    }

    console.log(`✨ Recebendo novo pedido da integração: ${nome_cliente}, Produto: ${nome_produto || 'Não informado'}`);

    const sql = 'INSERT INTO pedidos (nome, telefone, produto) VALUES (?, ?, ?)';
    // Removemos caracteres não numéricos do telefone para limpar o dado
    const telefoneLimpo = celular_cliente.replace(/\D/g, ''); 
    const params = [nome_cliente, telefoneLimpo, nome_produto];

    db.run(sql, params, function (err) {
        if (err) {
            console.error('❌ Erro ao salvar pedido da integração:', err.message);
            return res.status(500).json({ error: "Erro interno ao salvar o pedido." });
        }
        
        // Se tudo deu certo, respondemos com sucesso!
        res.status(201).json({
            message: "Pedido recebido e criado com sucesso!",
            pedidoId: this.lastID
        });
    });
};
