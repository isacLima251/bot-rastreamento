# Bot de Rastreamento Automático via WhatsApp

Este é um projeto Node.js que automatiza o rastreamento de pedidos e o envio de mensagens via WhatsApp, com suporte a planilhas do Google Sheets e APIs de rastreio como o Site Rastreio.

---

## 📅 Objetivo

* Automatizar o acompanhamento de pedidos enviados via Correios.
* Notificar os clientes automaticamente pelo WhatsApp sobre o status do pedido.
* Atualizar a planilha do Google com as informações de rastreio.

---

## 🎓 Tecnologias Utilizadas

* Node.js
* Google Sheets API
* Venom Bot (WhatsApp automation)
* Site Rastreio API
* Puppeteer (para Web Scraping futuro)

---

## 🚀 Como Funciona

1. Leitura da planilha no Google Sheets com os pedidos.
2. Consulta automática dos códigos de rastreio via API.
3. Envio de mensagens automáticas via WhatsApp com as atualizações.
4. Atualização dos campos na planilha (status, localização, data, etc).

---

## 🔧 Instalação

```bash
# Clonar o repositório
git clone https://github.com/isacLima251/bot-rastreamento.git
cd bot-rastreamento

# Instalar dependências
npm install

# Criar o arquivo .env
cp .env.example .env
```

Edite o `.env` com sua API Key e configurações.

---

## 🔹 Como Usar

### 1. Iniciar o bot do WhatsApp

```bash
node index.js
```

### 2. Rodar o rastreamento manualmente

```bash
node rastrearPedidos.js
```

---

## 📚 Estrutura do Projeto

```
meu-bot-rastreamento/
├── index.js                    # Envia mensagens de boas-vindas ou postagens
├── rastrearPedidos.js           # Verifica status e envia atualizações automáticas
├── src/
│   ├── services/
│   │   ├── googleSheetService.js
│   │   ├── whatsappService.js
│   │   └── rastreamentoService.js
│   └── utils/
│       └── messages.json
└── .env
```

---

## 🔒 Requisitos

* Conta Google com acesso à planilha
* API Key do Site Rastreio: [https://www.siterastreio.com.br/api-correios](https://www.siterastreio.com.br/api-correios)
* Chrome instalado (para o Puppeteer/Venom)

---

## ⚖️ Licença

MIT — Livre para usar e modificar.
