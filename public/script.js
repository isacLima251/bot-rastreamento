document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Seletores de Elementos ---
    const listaContactosEl = document.getElementById('lista-contactos');
    const mainContentAreaEl = document.getElementById('main-content-area'); // Agora vai encontrar este ID
    const chatWindowEl = document.getElementById('chat-window');
    const chatFooterEl = document.getElementById('chat-footer');
    const barraBuscaEl = document.getElementById('barra-busca');
    const btnAdicionarNovoEl = document.getElementById('btn-adicionar-novo');
    const modalPedidoEl = document.getElementById('modal-pedido');
    const formPedidoEl = document.getElementById('form-pedido');
    const modalTituloEl = document.getElementById('modal-titulo');
    const btnModalCancelarEl = document.getElementById('btn-modal-cancelar');
    const formEnviarMensagemEl = document.getElementById('form-enviar-mensagem');

    // --- 2. Estado da Aplicação ---
    let todosOsPedidos = [];
    let pedidoAtivoId = null;

    // --- 3. Funções de Renderização ---
    const renderizarListaDeContactos = () => {
        const termoBusca = barraBuscaEl.value.toLowerCase();
        const filtrados = todosOsPedidos.filter(p => p.nome.toLowerCase().includes(termoBusca) || p.telefone.includes(termoBusca));
        
        listaContactosEl.innerHTML = '';
        if (filtrados.length === 0) {
            listaContactosEl.innerHTML = `<p class="info-mensagem">${termoBusca ? `Nenhum resultado para "${termoBusca}"` : 'Nenhum contacto.'}</p>`;
            return;
        }
        filtrados.forEach(p => {
            const item = document.createElement('div');
            item.className = 'contact-item';
            item.dataset.id = p.id;
            if (p.id === pedidoAtivoId) item.classList.add('active');
            item.innerHTML = `<div class="info"><h4>${p.nome}</h4><p>${p.statusInterno || 'Novo Pedido'}</p></div>`;
            listaContactosEl.appendChild(item);
        });
    };

    const renderizarDetalhesDoPedido = async (pedido) => {
        pedidoAtivoId = pedido.id;
        chatWindowEl.innerHTML = `
            <div class="detalhes-header"><h3>Detalhes de ${pedido.nome} (#${pedido.id})</h3><button class="btn-editar-main">Editar</button></div>
            <div class="detalhes-body"><p><strong>Telefone:</strong> ${pedido.telefone}</p><p><strong>Produto:</strong> ${pedido.produto || 'N/A'}</p><p><strong>Rastreio:</strong> ${pedido.codigoRastreio || 'Nenhum'}</p></div>
            <div class="chat-feed" id="chat-feed"><p class="info-mensagem">A carregar histórico...</p></div>
        `;
        chatFooterEl.classList.add('active');
        formEnviarMensagemEl.querySelector('input').disabled = false;
        formEnviarMensagemEl.querySelector('button').disabled = false;
        renderizarListaDeContactos();

        try {
            const response = await fetch(`/api/pedidos/${pedido.id}/historico`);
            const { data: historico } = await response.json();
            const chatFeedEl = document.getElementById('chat-feed');
            chatFeedEl.innerHTML = '';
            if (!historico || historico.length === 0) {
                chatFeedEl.innerHTML = '<p class="info-mensagem">Nenhuma mensagem neste histórico.</p>';
            } else {
                historico.forEach(msg => {
                    const msgDiv = document.createElement('div');
                    msgDiv.className = `chat-message ${msg.origem === 'cliente' ? 'recebido' : 'enviado'}`;
                    const dataFormatada = new Date(msg.data_envio).toLocaleString('pt-BR');
                    msgDiv.innerHTML = `<p>${msg.mensagem.replace(/\n/g, '<br>')}</p><span class="timestamp">${dataFormatada}</span>`;
                    chatFeedEl.appendChild(msgDiv);
                });
                chatFeedEl.scrollTop = chatFeedEl.scrollHeight;
            }
        } catch (error) {
            document.getElementById('chat-feed').innerHTML = '<p class="info-mensagem" style="color: red;">Erro ao carregar histórico.</p>';
        }
    };
    
    // --- 4. Funções de API e Modal ---
    const fetchPedidos = async () => {
        try {
            const response = await fetch('/api/pedidos');
            if (!response.ok) throw new Error('Falha ao buscar pedidos.');
            todosOsPedidos = (await response.json()).data || [];
            renderizarListaDeContactos();
        } catch (e) {
            console.error("Falha ao buscar pedidos:", e);
            listaContactosEl.innerHTML = `<p class="info-mensagem" style="color:red;">Erro ao carregar contactos.</p>`;
        }
    };
    
    const abrirModal = (pedido = null) => {
        formPedidoEl.reset();
        modalTituloEl.textContent = 'Adicionar Novo Pedido';
        formPedidoEl.querySelector('#pedido-id').value = '';
        if (pedido) {
            modalTituloEl.textContent = 'Editar Pedido';
            Object.keys(pedido).forEach(key => {
                const input = formPedidoEl.querySelector(`[name="${key}"]`);
                if (input) input.value = pedido[key] || '';
            });
        }
        modalPedidoEl.classList.add('active');
    };
    const fecharModal = () => modalPedidoEl.classList.remove('active');

    // --- 5. Event Listeners ---
    btnAdicionarNovoEl.addEventListener('click', () => abrirModal());
    btnModalCancelarEl.addEventListener('click', fecharModal);
    modalPedidoEl.addEventListener('click', e => { if (e.target === modalPedidoEl) fecharModal(); });

    formPedidoEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = formPedidoEl.querySelector('#pedido-id').value;
        const dados = Object.fromEntries(new FormData(formPedidoEl).entries());
        const url = id ? `/api/pedidos/${id}` : '/api/pedidos';
        const method = id ? 'PUT' : 'POST';
        delete dados.id;
        try {
            const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) });
            if (!response.ok) throw new Error('Falha ao salvar.');
            fecharModal();
            await fetchPedidos();
            if (id) {
                const pedidoAtualizado = todosOsPedidos.find(p => p.id === parseInt(id, 10));
                if (pedidoAtualizado) await renderizarDetalhesDoPedido(pedidoAtualizado);
            }
        } catch (error) {
            alert(error.message);
        }
    });
    
    barraBuscaEl.addEventListener('input', () => {
        let debounceTimer;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => renderizarListaDeContactos(), 300);
    });

    listaContactosEl.addEventListener('click', async (e) => {
        const item = e.target.closest('.contact-item');
        if (item) {
            const pedidoId = parseInt(item.dataset.id, 10);
            const pedido = todosOsPedidos.find(p => p.id === pedidoId);
            if (pedido) await renderizarDetalhesDoPedido(pedido);
        }
    });

    mainContentAreaEl.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-editar-main')) {
            const pedido = todosOsPedidos.find(p => p.id === pedidoAtivoId);
            if (pedido) abrirModal(pedido);
        }
    });

    formEnviarMensagemEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        const inputMensagem = e.target.querySelector('#input-mensagem');
        const mensagem = inputMensagem.value.trim();
        if (!mensagem || !pedidoAtivoId) return;
        try {
            await fetch(`/api/pedidos/${pedidoAtivoId}/enviar-mensagem`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mensagem }) });
            inputMensagem.value = '';
            const pedidoAtivo = todosOsPedidos.find(p => p.id === pedidoAtivoId);
            await renderizarDetalhesDoPedido(pedidoAtivo);
        } catch (error) {
            alert(error.message);
        }
    });

    // --- 6. Inicialização ---
    fetchPedidos();
    setInterval(fetchPedidos, 30000);
});
