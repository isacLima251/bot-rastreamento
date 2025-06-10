document.addEventListener('DOMContentLoaded', () => {
    // Seletores dos elementos
    const formNovoPedido = document.getElementById('form-novo-pedido');
    const kanbanBoard = document.querySelector('.kanban-board');
    const barraBusca = document.getElementById('barra-busca');
    const modalConfirmacao = document.getElementById('modal-confirmacao');
    const btnModalConfirmar = document.getElementById('btn-modal-confirmar');
    const btnModalCancelar = document.getElementById('btn-modal-cancelar');
    let idParaApagar = null;
    let debounceTimer;

    // Função para carregar e exibir os pedidos
    const carregarPedidos = async (termoBusca = '') => {
        const colunaEntrada = document.getElementById('coluna-entrada');
        const colunaEsperando = document.getElementById('coluna-esperando');
        const colunaFinalizados = document.getElementById('coluna-finalizados');
        
        try {
            const url = termoBusca ? `/api/pedidos?busca=${encodeURIComponent(termoBusca)}` : '/api/pedidos';
            const response = await fetch(url);
            if (!response.ok) throw new Error('Falha ao buscar pedidos.');

            const { data: pedidos } = await response.json();
            colunaEntrada.innerHTML = '';
            colunaEsperando.innerHTML = '';
            colunaFinalizados.innerHTML = '';

            if (!pedidos || pedidos.length === 0) {
                colunaEntrada.innerHTML = `<p class="info-mensagem">${termoBusca ? `Nenhum resultado para "${termoBusca}"` : 'Nenhum pedido cadastrado.'}</p>`;
                return;
            }

            pedidos.forEach(pedido => {
                const pedidoCard = document.createElement('div');
                pedidoCard.className = 'pedido';
                pedidoCard.dataset.id = pedido.id;
                Object.keys(pedido).forEach(key => {
                    pedidoCard.dataset[key] = pedido[key] || '';
                });

                const status = (pedido.statusInterno || 'novo').toLowerCase();
                let statusClass = 'status-entrada';
                if (status === 'entregue') statusClass = 'status-finalizado';
                else if (status && status !== 'novo' && status !== 'boas-vindas enviada') statusClass = 'status-em-espera';
                pedidoCard.classList.add(statusClass);

                pedidoCard.innerHTML = `
                    <div class="pedido-info">
                        <h3>${pedido.nome} (#${pedido.id})</h3>
                        <p><strong>Telefone:</strong> ${pedido.telefone}</p>
                        <p><strong>Produto:</strong> ${pedido.produto || 'N/A'}</p>
                        <p><strong>Rastreio:</strong> ${pedido.codigoRastreio || 'Sem código'}</p>
                        <p><strong>Status:</strong> ${pedido.statusInterno || 'Novo'}</p>
                    </div>
                    <div class="pedido-acoes">
                        <button class="btn-editar">Editar</button>
                        <button class="btn-apagar">Apagar</button>
                    </div>
                `;
                
                if (statusClass === 'status-finalizado') colunaFinalizados.appendChild(pedidoCard);
                else if (statusClass === 'status-em-espera') colunaEsperando.appendChild(pedidoCard);
                else colunaEntrada.appendChild(pedidoCard);
            });
        } catch (error) {
            console.error(error);
        }
    };

    // Lógica para o modal de confirmação
    const abrirModal = (id) => { 
        document.getElementById('modal-texto').textContent = `Tem a certeza que quer apagar o pedido #${id}?`;
        idParaApagar = id; 
        modalConfirmacao.classList.add('active'); 
    };
    const fecharModal = () => { idParaApagar = null; modalConfirmacao.classList.remove('active'); };
    btnModalCancelar.addEventListener('click', fecharModal);

    btnModalConfirmar.addEventListener('click', async () => {
        if (!idParaApagar) return;
        try {
            await fetch(`/api/pedidos/${idParaApagar}`, { method: 'DELETE' });
            fecharModal();
            carregarPedidos(barraBusca.value);
        } catch (error) {
            alert('Falha ao apagar pedido.');
        }
    });

    // Eventos principais
    formNovoPedido.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const pedido = Object.fromEntries(formData.entries());
        try {
            await fetch('/api/pedidos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pedido) });
            e.target.reset();
            carregarPedidos();
        } catch (error) {
            alert('Falha ao criar pedido.');
        }
    });

    barraBusca.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => carregarPedidos(barraBusca.value), 300);
    });

    kanbanBoard.addEventListener('click', async (e) => {
        const card = e.target.closest('.pedido');
        if (!card) return;
        const id = card.dataset.id;

        if (e.target.classList.contains('btn-apagar')) {
            abrirModal(id);
        }
        
        if (e.target.classList.contains('btn-editar')) {
            card.classList.add('editando');
            card.querySelector('.pedido-info').innerHTML = `
                <input type="text" name="nome" value="${card.dataset.nome}" >
                <input type="text" name="telefone" value="${card.dataset.telefone}" >
                <input type="text" name="produto" value="${card.dataset.produto}" >
                <input type="text" name="codigoRastreio" value="${card.dataset.codigoRastreio}" >
            `;
            card.querySelector('.pedido-acoes').innerHTML = `<button class="btn-salvar">Salvar</button><button class="btn-cancelar">Cancelar</button>`;
        }

        if (e.target.classList.contains('btn-cancelar')) {
            carregarPedidos(barraBusca.value);
        }

        if (e.target.classList.contains('btn-salvar')) {
            const dados = {
                nome: card.querySelector('[name="nome"]').value,
                telefone: card.querySelector('[name="telefone"]').value,
                produto: card.querySelector('[name="produto"]').value,
                codigoRastreio: card.querySelector('[name="codigoRastreio"]').value,
            };
            try {
                await fetch(`/api/pedidos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) });
                carregarPedidos(barraBusca.value);
            } catch (error) {
                alert('Falha ao salvar.');
            }
        }
    });

    // Inicialização
    carregarPedidos();
    setInterval(() => {
        if (document.activeElement !== barraBusca) {
            carregarPedidos(barraBusca.value);
        }
    }, 30000);
});
