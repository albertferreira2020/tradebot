import dotenv from 'dotenv';
dotenv.config();
import { WebSocket } from 'ws';
import express from 'express';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import path from 'path';
import crypto from 'crypto';
import axios from 'axios';
import { Server } from 'socket.io';
import pg from 'pg';

// Obter o caminho do diretório atual para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração da API Binance - Com fallback para testes
const API_KEY = process.env.BINANCE_API_KEY || '';
const API_SECRET = process.env.BINANCE_API_SECRET || '';

// Configuração do servidor
const app = express();
const server = createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

// Configuração do PostgreSQL
const { Pool } = pg;
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'trading_data',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
});


// Inicialização da tabela no PostgreSQL
const initializeDatabase = async () => {
    try {
        const client = await pool.connect();

        // Criação da tabela para armazenar os dados dos candles
        await client.query(`
  CREATE TABLE IF NOT EXISTS candles (
    id SERIAL PRIMARY KEY,
    data_hora_registro TIMESTAMP NOT NULL,
    abertura NUMERIC NOT NULL,
    fechamento NUMERIC NOT NULL,
    maxima NUMERIC NOT NULL,
    minima NUMERIC NOT NULL,
    total_quantidade_compra NUMERIC NOT NULL,
    total_quantidade_venda NUMERIC NOT NULL,
    total_quantidade_trader_que_mais_comprou NUMERIC DEFAULT 0,
    preco_trader_que_mais_comprou NUMERIC DEFAULT 0,
    total_quantidade_trader_que_mais_vendeu NUMERIC DEFAULT 0,
    preco_trader_que_mais_vendeu NUMERIC DEFAULT 0,
    
    compra1_preco NUMERIC DEFAULT 0,
    compra1_quantidade NUMERIC DEFAULT 0,
    compra2_preco NUMERIC DEFAULT 0,
    compra2_quantidade NUMERIC DEFAULT 0,
    compra3_preco NUMERIC DEFAULT 0,
    compra3_quantidade NUMERIC DEFAULT 0,
    compra4_preco NUMERIC DEFAULT 0,
    compra4_quantidade NUMERIC DEFAULT 0,
    compra5_preco NUMERIC DEFAULT 0,
    compra5_quantidade NUMERIC DEFAULT 0,
    compra6_preco NUMERIC DEFAULT 0,
    compra6_quantidade NUMERIC DEFAULT 0,
    compra7_preco NUMERIC DEFAULT 0,
    compra7_quantidade NUMERIC DEFAULT 0,
    compra8_preco NUMERIC DEFAULT 0,
    compra8_quantidade NUMERIC DEFAULT 0,
    compra9_preco NUMERIC DEFAULT 0,
    compra9_quantidade NUMERIC DEFAULT 0,
    compra10_preco NUMERIC DEFAULT 0,
    compra10_quantidade NUMERIC DEFAULT 0,
    
    venda1_preco NUMERIC DEFAULT 0,
    venda1_quantidade NUMERIC DEFAULT 0,
    venda2_preco NUMERIC DEFAULT 0,
    venda2_quantidade NUMERIC DEFAULT 0,
    venda3_preco NUMERIC DEFAULT 0,
    venda3_quantidade NUMERIC DEFAULT 0,
    venda4_preco NUMERIC DEFAULT 0,
    venda4_quantidade NUMERIC DEFAULT 0,
    venda5_preco NUMERIC DEFAULT 0,
    venda5_quantidade NUMERIC DEFAULT 0,
    venda6_preco NUMERIC DEFAULT 0,
    venda6_quantidade NUMERIC DEFAULT 0,
    venda7_preco NUMERIC DEFAULT 0,
    venda7_quantidade NUMERIC DEFAULT 0,
    venda8_preco NUMERIC DEFAULT 0,
    venda8_quantidade NUMERIC DEFAULT 0,
    venda9_preco NUMERIC DEFAULT 0,
    venda9_quantidade NUMERIC DEFAULT 0,
    venda10_preco NUMERIC DEFAULT 0,
    venda10_quantidade NUMERIC DEFAULT 0,
    
    candle1 NUMERIC DEFAULT 0,
    candle2 NUMERIC DEFAULT 0,
    candle3 NUMERIC DEFAULT 0,
    candle4 NUMERIC DEFAULT 0,
    candle5 NUMERIC DEFAULT 0,
    candle6 NUMERIC DEFAULT 0,
    candle7 NUMERIC DEFAULT 0,
    candle8 NUMERIC DEFAULT 0,
    candle9 NUMERIC DEFAULT 0,
    candle10 NUMERIC DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);

        console.log('Tabela de candles inicializada com sucesso no PostgreSQL');
        client.release();
    } catch (error) {
        console.error('Erro ao inicializar banco de dados:', error);
    }
};

const insertCandleData = async (candleData) => {
    try {
        const client = await pool.connect();
        const query = `
      INSERT INTO candles (
        data_hora_registro,
        abertura,
        fechamento,
        maxima,
        minima,
        total_quantidade_compra,
        total_quantidade_venda,
        total_quantidade_trader_que_mais_comprou,
        preco_trader_que_mais_comprou,
        total_quantidade_trader_que_mais_vendeu,
        preco_trader_que_mais_vendeu,
        
        compra1_preco, compra1_quantidade,
        compra2_preco, compra2_quantidade,
        compra3_preco, compra3_quantidade,
        compra4_preco, compra4_quantidade,
        compra5_preco, compra5_quantidade,
        compra6_preco, compra6_quantidade,
        compra7_preco, compra7_quantidade,
        compra8_preco, compra8_quantidade,
        compra9_preco, compra9_quantidade,
        compra10_preco, compra10_quantidade,
        
        venda1_preco, venda1_quantidade,
        venda2_preco, venda2_quantidade,
        venda3_preco, venda3_quantidade,
        venda4_preco, venda4_quantidade,
        venda5_preco, venda5_quantidade,
        venda6_preco, venda6_quantidade,
        venda7_preco, venda7_quantidade,
        venda8_preco, venda8_quantidade,
        venda9_preco, venda9_quantidade,
        venda10_preco, venda10_quantidade,
        
        candle1, candle2, candle3, candle4, candle5,
        candle6, candle7, candle8, candle9, candle10
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
        $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
        $22, $23, $24, $25, $26, $27, $28, $29, $30, $31,
        $32, $33, $34, $35, $36, $37, $38, $39, $40, $41,
        $42, $43, $44, $45, $46, $47, $48, $49, $50, $51,
        $52, $53, $54, $55, $56, $57, $58, $59, $60, $61
      )
      RETURNING id;
    `;

        // Extrair dados de compras (bids)
        const compras = candleData['10_ultimas_compras_book'] || [];
        const comprasValues = [];
        for (let i = 0; i < 10; i++) {
            if (i < compras.length) {
                comprasValues.push(compras[i].preco, compras[i].quantidade);
            } else {
                comprasValues.push(0, 0); // Valores padrão se não houver dados suficientes
            }
        }

        // Extrair dados de vendas (asks)
        const vendas = candleData['10_ultimas_vendas_book'] || [];
        const vendasValues = [];
        for (let i = 0; i < 10; i++) {
            if (i < vendas.length) {
                vendasValues.push(vendas[i].preco, vendas[i].quantidade);
            } else {
                vendasValues.push(0, 0);
            }
        }

        const values = [
            new Date(candleData.data_hora_registro),
            candleData.abertura,
            candleData.fechamento,
            candleData.maxima,
            candleData.minima,
            candleData.total_quantidade_compra,
            candleData.total_quantidade_venda,
            candleData.total_quantidade_trader_que_mais_comprou || 0,
            candleData.preco_trader_que_mais_comprou || 0,
            candleData.total_quantidade_trader_que_mais_vendeu || 0,
            candleData.preco_trader_que_mais_vendeu || 0,
            ...comprasValues,
            ...vendasValues,
            candleData.candle1 || 0,
            candleData.candle2 || 0,
            candleData.candle3 || 0,
            candleData.candle4 || 0,
            candleData.candle5 || 0,
            candleData.candle6 || 0,
            candleData.candle7 || 0,
            candleData.candle8 || 0,
            candleData.candle9 || 0,
            candleData.candle10 || 0
        ];

        const result = await client.query(query, values);
        console.log(`Novo candle gravado com sucesso no PostgreSQL com ID: ${result.rows[0].id}`);
        client.release();
        return result.rows[0].id;
    } catch (error) {
        console.error('Erro ao gravar dados do candle no PostgreSQL:', error);
        return null;
    }
};

// Middleware para servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota para verificar o status do servidor
app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

// Função para assinar requisições à API da Binance
const signRequest = (queryString) => {
    if (!API_SECRET) {
        console.warn('API_SECRET não definido. Alguns endpoints podem não funcionar');
        return '';
    }
    return crypto.createHmac('sha256', API_SECRET).update(queryString).digest('hex');
};

// Função para obter dados históricos de candlestick
const getHistoricalCandlesticks = async () => {
    console.log('Tentando obter dados históricos de candlestick...');
    try {
        const response = await axios.get('https://api.binance.com/api/v3/klines', {
            params: {
                symbol: 'BTCUSDT',
                interval: '1m',
                limit: 100
            },
            ...(API_KEY ? { headers: { 'X-MBX-APIKEY': API_KEY } } : {})
        });
        const data = response.data.map(candle => ({
            time: candle[0] / 1000,
            open: parseFloat(candle[1]),
            high: parseFloat(candle[2]),
            low: parseFloat(candle[3]),
            close: parseFloat(candle[4]),
            volume: parseFloat(candle[5])
        }));
        console.log(`Dados históricos obtidos: ${data.length} registros`);
        return data;
    } catch (error) {
        console.error('Erro ao obter dados históricos:', error.message);
        if (error.response) {
            console.error('Resposta da API:', error.response.data);
        }
        return [];
    }
};

// Função para obter o book de ofertas
const getOrderBook = async () => {
    console.log('Tentando obter book de ofertas...');
    try {
        const response = await axios.get('https://api.binance.com/api/v3/depth', {
            params: {
                symbol: 'BTCUSDT',
                limit: 20
            },
            ...(API_KEY ? { headers: { 'X-MBX-APIKEY': API_KEY } } : {})
        });
        const result = {
            bids: response.data.bids.map(bid => ({ price: parseFloat(bid[0]), quantity: parseFloat(bid[1]) })),
            asks: response.data.asks.map(ask => ({ price: parseFloat(ask[0]), quantity: parseFloat(ask[1]) }))
        };
        console.log(`Book de ofertas obtido: ${result.bids.length} bids, ${result.asks.length} asks`);
        return result;
    } catch (error) {
        console.error('Erro ao obter book de ofertas:', error.message);
        if (error.response) {
            console.error('Resposta da API:', error.response.data);
        }
        return { bids: [], asks: [] };
    }
};

// Função para obter negociações recentes (trades)
const getRecentTrades = async () => {
    console.log('Tentando obter negociações recentes...');
    try {
        const response = await axios.get('https://api.binance.com/api/v3/trades', {
            params: {
                symbol: 'BTCUSDT',
                limit: 20
            },
            ...(API_KEY ? { headers: { 'X-MBX-APIKEY': API_KEY } } : {})
        });
        const data = response.data.map(trade => ({
            id: trade.id,
            price: parseFloat(trade.price),
            quantity: parseFloat(trade.qty),
            time: trade.time,
            isBuyerMaker: trade.isBuyerMaker,
            trader: `trader_${trade.id % 1000}` // Simulação de ID de trader
        }));
        console.log(`Negociações recentes obtidas: ${data.length} registros`);
        return data;
    } catch (error) {
        console.error('Erro ao obter negociações recentes:', error.message);
        if (error.response) {
            console.error('Resposta da API:', error.response.data);
        }
        return [];
    }
};

// Função para obter ticker de 24h para informações gerais de preço
const get24hTicker = async () => {
    console.log('Tentando obter ticker de 24h...');
    try {
        const response = await axios.get('https://api.binance.com/api/v3/ticker/24hr', {
            params: {
                symbol: 'BTCUSDT'
            },
            ...(API_KEY ? { headers: { 'X-MBX-APIKEY': API_KEY } } : {})
        });
        const data = {
            lastPrice: parseFloat(response.data.lastPrice),
            priceChange: parseFloat(response.data.priceChange),
            priceChangePercent: parseFloat(response.data.priceChangePercent),
            highPrice: parseFloat(response.data.highPrice),
            lowPrice: parseFloat(response.data.lowPrice),
            volume: parseFloat(response.data.volume),
            quoteVolume: parseFloat(response.data.quoteVolume)
        };
        console.log('Ticker de 24h obtido com sucesso');
        return data;
    } catch (error) {
        console.error('Erro ao obter ticker de 24h:', error.message);
        if (error.response) {
            console.error('Resposta da API:', error.response.data);
        }
        return null;
    }
};

// Função para obter dados do índice de medo e ganância
const getFearAndGreedIndex = async () => {
    console.log('Tentando obter índice de medo e ganância...');
    try {
        const response = await axios.get('https://api.alternative.me/fng/?limit=30');
        const data = response.data.data.map(item => ({
            value: parseInt(item.value),
            value_classification: item.value_classification,
            timestamp: item.timestamp * 1000,
            time: item.timestamp * 1000,
            date: item.timestamp_reference
        }));
        console.log(`Índice de medo e ganância obtido: ${data.length} registros`);
        return data;
    } catch (error) {
        console.error('Erro ao obter índice de medo e ganância:', error.message);
        console.log('Gerando dados simulados para o índice de medo e ganância');
        const today = new Date();
        const daysAgo = (days) => {
            const date = new Date(today);
            date.setDate(date.getDate() - days);
            return date.getTime();
        };
        return Array.from({ length: 30 }, (_, i) => {
            const value = Math.floor(Math.random() * 50) + 25;
            let classification;
            if (value < 25) classification = 'Medo Extremo';
            else if (value < 45) classification = 'Medo';
            else if (value < 55) classification = 'Neutro';
            else if (value < 75) classification = 'Ganância';
            else classification = 'Ganância Extrema';
            const timestamp = daysAgo(29 - i);
            const date = new Date(timestamp).toISOString().split('T')[0];
            return {
                value,
                value_classification: classification,
                timestamp,
                time: timestamp,
                date
            };
        });
    }
};

// Array global para armazenar os fechamentos dos últimos candles
let lastClosedCandles = [];

// Inicializar WebSockets da Binance para dados em tempo real
let klineWs, depthWs, tradeWs;

// Função para conectar WebSockets com tratamento de erro
const connectWebSockets = () => {
    try {
        console.log('Conectando WebSockets...');
        const handleWsError = (wsName) => (error) => {
            console.error(`Erro no WebSocket ${wsName}:`, error);
        };
        const handleWsClose = (wsName, reconnectFunc) => () => {
            console.log(`WebSocket ${wsName} fechado. Tentando reconectar em 5 segundos...`);
            setTimeout(reconnectFunc, 5000);
        };

        // Conectar WebSocket de kline
        klineWs = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@kline_1m');
        klineWs.on('error', handleWsError('kline'));
        klineWs.on('close', handleWsClose('kline', () => {
            klineWs = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@kline_1m');
            setupKlineWsHandlers();
        }));
        setupKlineWsHandlers();

        // Conectar WebSocket de depth (book de ofertas)
        depthWs = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@depth');
        depthWs.on('error', handleWsError('depth'));
        depthWs.on('close', handleWsClose('depth', () => {
            depthWs = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@depth');
            setupDepthWsHandlers();
        }));
        setupDepthWsHandlers();

        // Conectar WebSocket de trades
        tradeWs = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');
        tradeWs.on('error', handleWsError('trade'));
        tradeWs.on('close', handleWsClose('trade', () => {
            tradeWs = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');
            setupTradeWsHandlers();
        }));
        setupTradeWsHandlers();

        console.log('WebSockets conectados com sucesso');
    } catch (error) {
        console.error('Erro ao conectar WebSockets:', error);
        console.log('Tentando reconectar WebSockets em 5 segundos...');
        setTimeout(connectWebSockets, 5000);
    }
};

const setupKlineWsHandlers = () => {
    klineWs.on('message', async (data) => {
        try {
            const message = JSON.parse(data);
            // Processa os dados do candlestick
            const candle = {
                time: message.k.t / 1000,
                open: parseFloat(message.k.o),
                high: parseFloat(message.k.h),
                low: parseFloat(message.k.l),
                close: parseFloat(message.k.c),
                volume: parseFloat(message.k.v)
            };
            // Emite o candle em atualização para os clientes
            io.emit('candle_update', candle);

            // Se o candle estiver fechado (message.k.x é true)
            if (message.k.x) {
                const orderBook = await getOrderBook();
                const recentTrades = await getRecentTrades();

                // Encontrar o trader que mais comprou
                const compradores = recentTrades
                    .filter(trade => !trade.isBuyerMaker) // Compras (market takers comprando)
                    .reduce((acc, trade) => {
                        const traderId = trade.trader;
                        if (!acc[traderId]) {
                            acc[traderId] = {
                                totalQuantidade: 0,
                                ultimoPreco: 0
                            };
                        }
                        acc[traderId].totalQuantidade += trade.quantity;
                        acc[traderId].ultimoPreco = trade.price;
                        return acc;
                    }, {});

                // Encontrar o trader que mais vendeu
                const vendedores = recentTrades
                    .filter(trade => trade.isBuyerMaker) // Vendas (market takers vendendo)
                    .reduce((acc, trade) => {
                        const traderId = trade.trader;
                        if (!acc[traderId]) {
                            acc[traderId] = {
                                totalQuantidade: 0,
                                ultimoPreco: 0
                            };
                        }
                        acc[traderId].totalQuantidade += trade.quantity;
                        acc[traderId].ultimoPreco = trade.price;
                        return acc;
                    }, {});

                // Encontrar o maior comprador
                let maiorComprador = { totalQuantidade: 0, ultimoPreco: 0 };
                for (const [traderId, dados] of Object.entries(compradores)) {
                    if (dados.totalQuantidade > maiorComprador.totalQuantidade) {
                        maiorComprador = dados;
                    }
                }

                // Encontrar o maior vendedor
                let maiorVendedor = { totalQuantidade: 0, ultimoPreco: 0 };
                for (const [traderId, dados] of Object.entries(vendedores)) {
                    if (dados.totalQuantidade > maiorVendedor.totalQuantidade) {
                        maiorVendedor = dados;
                    }
                }

                // Cria o objeto base com os dados do candle fechado
                const candleData = {
                    data_hora_registro: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
                    abertura: parseFloat(message.k.o),
                    fechamento: parseFloat(message.k.c),
                    maxima: parseFloat(message.k.h),
                    minima: parseFloat(message.k.l),
                    total_quantidade_compra: orderBook.bids
                        .slice(0, 10)
                        .reduce((acc, bid) => acc + bid.quantity, 0),
                    total_quantidade_venda: orderBook.asks
                        .slice(0, 10)
                        .reduce((acc, ask) => acc + ask.quantity, 0),
                    total_quantidade_trader_que_mais_comprou: maiorComprador.totalQuantidade,
                    preco_trader_que_mais_comprou: maiorComprador.ultimoPreco,
                    total_quantidade_trader_que_mais_vendeu: maiorVendedor.totalQuantidade,
                    preco_trader_que_mais_vendeu: maiorVendedor.ultimoPreco,
                    "10_ultimas_compras_book": orderBook.bids.slice(0, 10).map(bid => ({
                        preco: bid.price,
                        quantidade: bid.quantity
                    })),
                    "10_ultimas_vendas_book": orderBook.asks.slice(0, 10).map(ask => ({
                        preco: ask.price,
                        quantidade: ask.quantity
                    }))
                };

                // Atualiza o array global com o fechamento do candle atual
                lastClosedCandles.push(parseFloat(message.k.c));
                if (lastClosedCandles.length > 10) {
                    lastClosedCandles.shift();
                }

                // Cria um array preenchido de tamanho 10 com zeros
                const filled = new Array(10).fill(0);
                const len = lastClosedCandles.length;

                // Coloca os fechamentos disponíveis nas últimas posições do array "filled"
                for (let j = 0; j < len; j++) {
                    filled[10 - len + j] = lastClosedCandles[j];
                }

                // Mapeia o array "filled" para as chaves desejadas:
                // filled[0] -> candle10 (mais antigo), filled[9] -> candle1 (mais recente)
                const candlesObj = {};
                for (let i = 0; i < 10; i++) {
                    candlesObj[`candle${10 - i}`] = filled[i];
                }

                // Mescla os atributos dos candles no objeto candleData
                Object.assign(candleData, candlesObj);

                // Agora grava o objeto no PostgreSQL
                const insertedId = await insertCandleData(candleData);

                // Log para depuração e emite o objeto para os clientes
                console.log(`Candle fechado gravado no PostgreSQL com ID: ${insertedId}`);
                io.emit('candle_closed', candleData);
            }
        } catch (error) {
            console.error('Erro ao processar mensagem do WebSocket de kline:', error);
        }
    });
};

// Configurar handlers para o WebSocket de depth
const setupDepthWsHandlers = () => {
    depthWs.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            if (message.b && message.a) {
                const depthUpdate = {
                    bids: message.b.map(bid => ({ price: parseFloat(bid[0]), quantity: parseFloat(bid[1]) })),
                    asks: message.a.map(ask => ({ price: parseFloat(ask[0]), quantity: parseFloat(ask[1]) }))
                };
                io.emit('depth_update', depthUpdate);
            }
        } catch (error) {
            console.error('Erro ao processar mensagem do WebSocket de depth:', error);
        }
    });
};

// Armazenar traders ativos
const activeTraders = new Map();

// Configurar handlers para o WebSocket de trade
const setupTradeWsHandlers = () => {
    tradeWs.on('message', (data) => {
        try {
            const trade = JSON.parse(data);
            const traderId = `trader_${trade.t % 1000}`;
            const quantity = parseFloat(trade.q);
            if (quantity > 0.01) {
                activeTraders.set(traderId, {
                    id: traderId,
                    lastPrice: parseFloat(trade.p),
                    quantity,
                    time: trade.T,
                    isBuyer: !trade.m,
                    lastActive: Date.now()
                });
                io.emit('trade', {
                    id: trade.t,
                    price: parseFloat(trade.p),
                    quantity,
                    time: trade.T,
                    isBuyer: !trade.m,
                    trader: traderId
                });
            }
            const now = Date.now();
            for (const [id, trader] of activeTraders.entries()) {
                if (now - trader.lastActive > 60000) {
                    activeTraders.delete(id);
                }
            }
            const filteredActiveTraders = Array.from(activeTraders.values())
                .filter(trader => trader.quantity > 0.01);
            io.emit('active_traders', filteredActiveTraders);
        } catch (error) {
            console.error('Erro ao processar mensagem do WebSocket de trade:', error);
        }
    });
};

// Socket.io para comunicação com o cliente
io.on('connection', async (socket) => {
    console.log('Cliente conectado');
    try {
        const ticker24h = await get24hTicker();
        if (ticker24h) {
            console.log('Enviando dados de ticker 24h para o cliente');
            socket.emit('ticker_24h', ticker24h);
        } else {
            console.log('Não foi possível obter dados de ticker 24h');
        }

        const historicalData = await getHistoricalCandlesticks();
        if (historicalData.length > 0) {
            console.log('Enviando dados históricos para o cliente');
            socket.emit('historical_data', historicalData);
        } else {
            console.log('Não foi possível obter dados históricos');
        }

        const orderBook = await getOrderBook();
        if (orderBook.bids.length > 0 || orderBook.asks.length > 0) {
            console.log('Enviando book de ofertas para o cliente');
            socket.emit('order_book', orderBook);
        } else {
            console.log('Não foi possível obter book de ofertas');
        }

        const recentTrades = await getRecentTrades();
        if (recentTrades.length > 0) {
            console.log('Enviando negociações recentes para o cliente');
            socket.emit('recent_trades', recentTrades);
        } else {
            console.log('Não foi possível obter negociações recentes');
        }

        const fearAndGreedData = await getFearAndGreedIndex();
        if (fearAndGreedData.length > 0) {
            console.log('Enviando dados de medo e ganância para o cliente');
            socket.emit('fear_and_greed_data', fearAndGreedData);
        } else {
            console.log('Não foi possível obter dados de medo e ganância');
        }
    } catch (error) {
        console.error('Erro ao processar conexão do cliente:', error);
    }

    socket.on('disconnect', () => {
        console.log('Cliente desconectado');
    });
});

// Inicializar o banco de dados
initializeDatabase();

// Iniciar conexões de WebSocket
connectWebSockets();

// Atualizar índice de medo e ganância a cada 6 horas
setInterval(async () => {
    try {
        console.log('Atualizando índice de medo e ganância...');
        const fearAndGreedData = await getFearAndGreedIndex();
        io.emit('fear_and_greed_data', fearAndGreedData);
    } catch (error) {
        console.error('Erro ao atualizar índice de medo e ganância:', error.message);
    }
}, 3000);

// Atualizar ticker de 24h a cada 5 minutos
setInterval(async () => {
    try {
        console.log('Atualizando ticker de 24h...');
        const ticker24h = await get24hTicker();
        if (ticker24h) {
            io.emit('ticker_24h', ticker24h);
        }
    } catch (error) {
        console.error('Erro ao atualizar ticker de 24h:', error.message);
    }
}, 500);

// Iniciar o servidor
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
});