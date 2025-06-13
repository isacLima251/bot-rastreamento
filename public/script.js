document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Seletores de Elementos ---
    const listaContactosEl = document.getElementById('lista-contactos');
    const mainContentAreaEl = document.getElementById('main-content-area');
    const chatWindowEl = document.getElementById('chat-window');
    const chatFooterEl = document.getElementById('chat-footer');
    const barraBuscaEl = document.getElementById('barra-busca');
    const btnAdicionarNovoEl = document.getElementById('btn-adicionar-novo');
    const modalPedidoEl = document.getElementById('modal-pedido');
    const formPedidoEl = document.getElementById('form-pedido');
    const modalTituloEl = document.getElementById('modal-titulo');
    const btnModalCancelarEl = document.getElementById('btn-modal-cancelar');
    const formEnviarMensagemEl = document.getElementById('form-enviar-mensagem');
    const notificacaoEl = document.getElementById('notificacao');
    const notificacaoTextoEl = document.getElementById('notificacao-texto');

    // --- ADICIONADO: Seletores para a nova UI de Configurações ---
    const chatViewEl = document.getElementById('chat-view');
    const settingsViewEl = document.getElementById('settings-view');
    const btnSettingsEl = document.getElementById('btn-settings');
    const statusIndicatorEl = document.getElementById('status-whatsapp');
    const statusTextEl = statusIndicatorEl.querySelector('.status-text');
    const settingsStatusTextEl = document.getElementById('settings-status-text');
    const qrCodeContainerEl = document.getElementById('qr-code-container');
    const btnConectarEl = document.getElementById('btn-conectar');
    const btnDesconectarEl = document.getElementById('btn-desconectar');


    // --- 2. Estado da Aplicação ---
    let todosOsPedidos = [];
    let pedidoAtivoId = null;
    let debounceTimer;
    let notificacaoTimer;

    // --- 3. Funções de UI e Notificação ---
    const showNotification = (message, type = 'error') => {
        clearTimeout(notificacaoTimer);
        notificacaoEl.classList.remove('show', 'error', 'success');
        
        notificacaoTextoEl.textContent = message;
        notificacaoEl.classList.add(type);
        notificacaoEl.classList.add('show');

        notificacaoTimer = setTimeout(() => {
            notificacaoEl.classList.remove('show');
        }, 4000);
    };

    function showView(viewName) {
        chatViewEl.classList.add('hidden');
        settingsViewEl.classList.add('hidden');
        document.getElementById(`${viewName}-view`).classList.remove('hidden');
    }

    function updateStatusUI(status, data = {}) {
        statusIndicatorEl.className = 'status-indicator';
        statusIndicatorEl.classList.add(status.toLowerCase());
        
        const statusMap = {
            DISCONNECTED: 'Desconectado',
            CONNECTING: 'A conectar...',
            CONNECTED: 'Conectado',
            QR_CODE: 'Aguardando QR Code'
        };
        statusTextEl.textContent = statusMap[status] || 'Desconhecido';
        settingsStatusTextEl.textContent = statusMap[status] || 'Desconhecido';

        qrCodeContainerEl.innerHTML = '';
        if (status === 'QR_CODE' && data.qrCode) {
            qrCodeContainerEl.innerHTML = `<p>Escaneie o QR Code com seu celular:</p><img src="${data.qrCode}" alt="QR Code do WhatsApp">`;
        }

        btnConectarEl.style.display = (status === 'DISCONNECTED') ? 'inline-block' : 'none';
        btnDesconectarEl.style.display = (status === 'CONNECTED') ? 'inline-block' : 'none';
    }

    // --- 4. Lógica WebSocket (Tempo Real) ---
    const connectWebSocket = () => {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const ws = new WebSocket(`${wsProtocol}://${window.location.host}`);
        ws.onopen = () => console.log('🔗 Conexão WebSocket estabelecida.');
        
        // --- CORRIGIDO: Lógica do onmessage completa ---
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('🔔 Notificação WebSocket recebida:', data);
            
            if (data.type === 'nova_mensagem') {
                const pedidoAfetado = todosOsPedidos.find(p => p.id === data.pedidoId);
                if (pedidoAfetado) {
                    if (pedidoAfetado.id !== pedidoAtivoId) {
                        pedidoAfetado.mensagensNaoLidas = (pedidoAfetado.mensagensNaoLidas || 0) + 1;
                        renderizarListaDeContactos();
                    } else {
                        fetchErenderizarTudo();
                    }
                } else {
                    fetchErenderizarTudo();
                }
            } else if (data.type === 'status_update') {
                updateStatusUI(data.status, data);
            }
        };

        ws.onclose = () => {
            console.log('🔌 Conexão WebSocket fechada. A tentar reconectar...');
            setTimeout(connectWebSocket, 5000);
        };
    };

    // --- 5. Funções de Renderização e API ---
    const renderizarListaDeContactos = () => {
        const termoBusca = barraBuscaEl.value.toLowerCase();
        const filtrados = todosOsPedidos.filter(p => 
            (p.nome && p.nome.toLowerCase().includes(termoBusca)) || 
            (p.telefone && p.telefone.includes(termoBusca))
        );
        
        listaContactosEl.innerHTML = '';
        if (filtrados.length === 0) {
            listaContactosEl.innerHTML = `<p class="info-mensagem">${termoBusca ? `Nenhum resultado para "${termoBusca}"` : 'Nenhum contacto.'}</p>`;
            return;
        }

        filtrados.sort((a, b) => (b.mensagensNaoLidas || 0) - (a.mensagensNaoLidas || 0));

        filtrados.forEach(pedido => {
            const item = document.createElement('div');
            item.className = 'contact-item';
            item.dataset.id = pedido.id;
            if (pedido.id === pedidoAtivoId) item.classList.add('active');

            const primeiraLetra = pedido.nome ? pedido.nome.charAt(0).toUpperCase() : '?';
            const fotoHtml = pedido.fotoPerfilUrl
                ? `<img src="${pedido.fotoPerfilUrl}" alt="Foto de ${pedido.nome}" onerror="this.style.display='none'; this.parentElement.querySelector('.avatar-fallback').style.display='flex';">
                   <div class="avatar-fallback" style="display: none;">${primeiraLetra}</div>`
                : `<div class="avatar-fallback">${primeiraLetra}</div>`;
            
            const bolinhaDisplay = pedido.mensagensNaoLidas > 0 ? 'flex' : 'none';
            const bolinhaHtml = `<div class="unread-indicator" style="display: ${bolinhaDisplay};"></div>`;

            item.innerHTML = `
                <div class="avatar-container">
                    ${fotoHtml}
                </div>
                <div class="info">
                    <h4>${pedido.nome}</h4>
                    <p>${pedido.statusInterno || 'Novo Pedido'}</p>
                </div>
                ${bolinhaHtml}
            `;
            listaContactosEl.appendChild(item);
        });
    };
    
    const selecionarPedidoErenderizarDetalhes = async (pedido) => {
        if (!pedido) return;
        
        if (pedido.mensagensNaoLidas > 0) {
            try {
                await fetch(`/api/pedidos/${pedido.id}/marcar-como-lido`, { method: 'PUT' });
                pedido.mensagensNaoLidas = 0;
            } catch (error) {
                console.error("Falha ao marcar como lido:", error);
            }
        }
        
        pedidoAtivoId = pedido.id;
        
        chatWindowEl.innerHTML = `
            <div class="detalhes-header">
                <h3>${pedido.nome} (#${pedido.id})</h3>
                <div>
                    <button class="btn-editar-main">Editar</button>
                    <button class="btn-atualizar-foto" data-id="${pedido.id}">Atualizar Foto</button>
                </div>
            </div>
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
                    const dataFormatada = new Date(msg.data_envio).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
                    msgDiv.innerHTML = `<p>${msg.mensagem.replace(/\n/g, '<br>')}</p><span class="timestamp">${dataFormatada}</span>`;
                    chatFeedEl.appendChild(msgDiv);
                });
                chatFeedEl.scrollTop = chatFeedEl.scrollHeight;
            }
        } catch (error) {
            document.getElementById('chat-feed').innerHTML = '<p class="info-mensagem" style="color: red;">Erro ao carregar histórico.</p>';
        }
    };

    const fetchErenderizarTudo = async () => {
        try {
            const response = await fetch('/api/pedidos');
            if (!response.ok) throw new Error('Falha ao buscar pedidos.');
            todosOsPedidos = (await response.json()).data || [];
            
            renderizarListaDeContactos();

            if (pedidoAtivoId) {
                const pedidoAtivo = todosOsPedidos.find(p => p.id === pedidoAtivoId);
                if (pedidoAtivo) {
                    await selecionarPedidoErenderizarDetalhes(pedidoAtivo);
                } else {
                    pedidoAtivoId = null;
                    chatWindowEl.innerHTML = `<div class="placeholder"><h3>Selecione um contacto</h3><p>O contacto anterior não foi encontrado.</p></div>`;
                    chatFooterEl.classList.remove('active');
                }
            }
        } catch (e) {
            console.error("Falha ao buscar e renderizar:", e);
        }
    };

    // --- 6. Funções do Modal ---
    const abrirModal = (pedido = null) => {
        formPedidoEl.reset();
        
        modalTituloEl.textContent = 'Adicionar Novo Pedido';
        formPedidoEl.querySelector('#pedido-id').value = '';
        if (pedido) {
            modalTituloEl.textContent = 'Editar Pedido';
            formPedidoEl.querySelector('#pedido-id').value = pedido.id;
            Object.keys(pedido).forEach(key => {
                const input = formPedidoEl.querySelector(`[name="${key}"]`);
                if (input) input.value = pedido[key] || '';
            });
        }
        modalPedidoEl.classList.add('active');
    };
    const fecharModal = () => modalPedidoEl.classList.remove('active');

    // --- 7. Event Listeners ---
    btnAdicionarNovoEl.addEventListener('click', () => abrirModal());
    btnModalCancelarEl.addEventListener('click', fecharModal);
    modalPedidoEl.addEventListener('click', e => { if (e.target === modalPedidoEl) fecharModal(); });

    formPedidoEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = formPedidoEl.querySelector('#pedido-id').value;
        const dados = Object.fromEntries(new FormData(e.target).entries());
        const url = id ? `/api/pedidos/${id}` : '/api/pedidos';
        const method = id ? 'PUT' : 'POST';
        delete dados.id;
        try {
            const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) });
            const resultado = await response.json();
            if (!response.ok) throw new Error(resultado.error || 'Falha ao salvar.');
            
            fecharModal();
            showNotification(resultado.message || 'Operação realizada com sucesso!', 'success');
            await fetchErenderizarTudo();
        } catch (error) { 
            showNotification(error.message, 'error');
        }
    });
    
    barraBuscaEl.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(renderizarListaDeContactos, 300);
    });

    btnSettingsEl.addEventListener('click', () => {
        showView('settings');
    });

    btnConectarEl.addEventListener('click', () => {
        fetch('/api/whatsapp/connect', { method: 'POST' });
    });

    btnDesconectarEl.addEventListener('click', () => {
        if (confirm('Tem a certeza que deseja desconectar a sessão do WhatsApp?')) {
            fetch('/api/whatsapp/disconnect', { method: 'POST' });
        }
    });

    // --- REMOVIDO: Bloco duplicado de listener ---
    listaContactosEl.addEventListener('click', async (e) => {
        const item = e.target.closest('.contact-item');
        if (item) {
            showView('chat');
            const pedidoId = parseInt(item.dataset.id, 10);
            const pedido = todosOsPedidos.find(p => p.id === pedidoId);
            if (pedido) {
                await selecionarPedidoErenderizarDetalhes(pedido);
            }
        }
    });

    mainContentAreaEl.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-editar-main')) {
            const pedido = todosOsPedidos.find(p => p.id === pedidoAtivoId);
            if (pedido) abrirModal(pedido);
        }

        if (e.target.classList.contains('btn-atualizar-foto')) {
            const botao = e.target;
            const pedidoId = parseInt(botao.dataset.id, 10);
            if (!pedidoId) return;

            botao.textContent = 'A atualizar...';
            botao.disabled = true;

            try {
                const response = await fetch(`/api/pedidos/${pedidoId}/atualizar-foto`, { method: 'POST' });
                const resultado = await response.json();
                if (!response.ok) {
                    throw new Error(resultado.error || 'Falha ao buscar foto.');
                }
                showNotification('Foto de perfil atualizada com sucesso!', 'success');
                await fetchErenderizarTudo();
            } catch (error) {
                showNotification(error.message, 'error');
            }
        }
    });

    formEnviarMensagemEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        const inputMensagem = e.target.querySelector('#input-mensagem');
        const mensagem = inputMensagem.value.trim();
        if (!mensagem || !pedidoAtivoId) return;
        try {
            const response = await fetch(`/api/pedidos/${pedidoAtivoId}/enviar-mensagem`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mensagem }) });
            if (!response.ok) throw new Error('Falha ao enviar mensagem.');
            inputMensagem.value = '';
            
            const pedidoAtivo = todosOsPedidos.find(p => p.id === pedidoAtivoId);
            await selecionarPedidoErenderizarDetalhes(pedidoAtivo);
        } catch (error) { 
            showNotification(error.message, 'error');
        }
    });

    // --- 8. Inicialização ---
    fetchErenderizarTudo();
    connectWebSocket();
});