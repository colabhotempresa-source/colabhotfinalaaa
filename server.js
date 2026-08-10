const express = require('express');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// ========== CONFIGURAÇÕES MERCADO PAGO ==========
const MP_ACCESS_TOKEN = 'APP_USR-8797267091485744-080614-3628865a23abc1d781f9b5ba94633ab4-3361822415';
const MP_API_URL = 'https://api.mercadopago.com/v1/payments';

// Middleware para JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Servir arquivos estáticos da raiz
app.use(express.static(__dirname));

// Headers de segurança
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-Frame-Options', 'DENY');
    next();
});

// Rota OPTIONS para CORS preflight
app.options('*', (req, res) => {
    res.status(204).end();
});

// ========== API MERCADO PAGO - CRIAR PIX ==========
app.post('/api/criar-pix', async (req, res) => {
    console.log('📥 Requisição recebida para criar PIX');
    
    try {
        const { transaction_amount, description, payer } = req.body;

        // Validar dados obrigatórios
        if (!transaction_amount || !description || !payer) {
            return res.status(400).json({
                error: true,
                message: 'Dados incompletos. Envie: transaction_amount, description, payer'
            });
        }

        if (!payer.email || !payer.first_name || !payer.identification || !payer.identification.number) {
            return res.status(400).json({
                error: true,
                message: 'Dados do pagador incompletos'
            });
        }

        console.log('💳 Criando pagamento PIX no Mercado Pago...');
        console.log('📊 Valor:', transaction_amount);
        console.log('📝 Descrição:', description);

        // Criar pagamento PIX na API do Mercado Pago
        const response = await axios.post(
            MP_API_URL,
            {
                transaction_amount: Number(transaction_amount),
                description: description,
                payment_method_id: 'pix',
                payer: {
                    email: payer.email,
                    first_name: payer.first_name,
                    last_name: payer.last_name || '',
                    identification: {
                        type: 'CPF',
                        number: payer.identification.number
                    }
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                    'X-Idempotency-Key': `pix_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
                },
                timeout: 15000
            }
        );

        const paymentData = response.data;
        console.log('✅ Pagamento PIX criado com sucesso!');
        console.log('🔑 ID:', paymentData.id);
        console.log('📊 Status:', paymentData.status);

        // Extrair dados do QR Code
        const qrData = paymentData.point_of_interaction?.transaction_data || {};

        // Retornar dados formatados
        return res.json({
            success: true,
            id: paymentData.id,
            status: paymentData.status,
            transaction_amount: paymentData.transaction_amount,
            description: paymentData.description,
            date_created: paymentData.date_created,
            date_of_expiration: paymentData.date_of_expiration,
            qr_code: qrData.qr_code || '',
            qr_code_base64: qrData.qr_code_base64 || '',
            ticket_url: qrData.ticket_url || ''
        });

    } catch (error) {
        console.error('❌ Erro ao criar PIX:');
        
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
            
            return res.status(error.response.status).json({
                error: true,
                message: error.response.data?.message || 'Erro ao processar pagamento',
                details: error.response.data
            });
        }
        
        console.error('Erro:', error.message);
        return res.status(500).json({
            error: true,
            message: 'Erro interno ao criar pagamento PIX'
        });
    }
});

// ========== API MERCADO PAGO - VERIFICAR PAGAMENTO ==========
app.get('/api/verificar-pagamento/:paymentId', async (req, res) => {
    const { paymentId } = req.params;
    
    console.log('🔍 Verificando pagamento:', paymentId);

    try {
        const response = await axios.get(
            `${MP_API_URL}/${paymentId}`,
            {
                headers: {
                    'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
                },
                timeout: 10000
            }
        );

        const paymentData = response.data;
        console.log('✅ Status do pagamento:', paymentData.status);

        return res.json({
            success: true,
            id: paymentData.id,
            status: paymentData.status,
            status_detail: paymentData.status_detail,
            transaction_amount: paymentData.transaction_amount,
            description: paymentData.description,
            date_approved: paymentData.date_approved,
            date_created: paymentData.date_created,
            date_of_expiration: paymentData.date_of_expiration
        });

    } catch (error) {
        console.error('❌ Erro ao verificar pagamento:');
        
        if (error.response) {
            console.error('Status:', error.response.status);
            return res.status(error.response.status).json({
                error: true,
                message: 'Erro ao consultar pagamento',
                details: error.response.data
            });
        }
        
        console.error('Erro:', error.message);
        return res.status(500).json({
            error: true,
            message: 'Erro interno ao verificar pagamento'
        });
    }
});

// ========== ROTA DE SAÚDE ==========
app.get('/health', (req, res) => {
    res.json({
        status: 'online',
        gateway: 'Mercado Pago',
        timestamp: new Date().toISOString()
    });
});

// ========== SERVE INDEX.HTML PARA QUALQUER OUTRA ROTA ==========
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ========== INICIAR SERVIDOR ==========
app.listen(PORT, () => {
    console.log('🚀 ==========================================');
    console.log('🚀 COLAB HOT PRO - Servidor Iniciado');
    console.log('🚀 ==========================================');
    console.log(`📍 Porta: ${PORT}`);
    console.log(`💳 Gateway: Mercado Pago`);
    console.log(`🔗 API PIX: POST /api/criar-pix`);
    console.log(`🔍 Verificar: GET /api/verificar-pagamento/:id`);
    console.log('🚀 ==========================================');
});
