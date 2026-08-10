const express = require('express');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurações Mercado Pago
const MP_ACCESS_TOKEN = 'APP_USR-8797267091485744-080614-3628865a23abc1d781f9b5ba94633ab4-3361822415';
const MP_API_URL = 'https://api.mercadopago.com/v1/payments';

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(__dirname));

// Headers CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

app.options('*', (req, res) => res.status(204).end());

// Criar PIX
app.post('/api/criar-pix', async (req, res) => {
    try {
        const { transaction_amount, description, payer } = req.body;

        if (!transaction_amount || !payer?.email || !payer?.first_name) {
            return res.status(400).json({ error: true, message: 'Dados incompletos' });
        }

        const response = await axios.post(MP_API_URL, {
            transaction_amount: Number(transaction_amount),
            description: description,
            payment_method_id: 'pix',
            payer: {
                email: payer.email,
                first_name: payer.first_name,
                last_name: payer.last_name || payer.first_name,
                identification: {
                    type: 'CPF',
                    number: payer.identification?.number || '00000000000'
                }
            }
        }, {
            headers: {
                'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': `pix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            },
            timeout: 15000
        });

        const data = response.data;
        const qrData = data.point_of_interaction?.transaction_data || {};

        return res.json({
            success: true,
            id: data.id,
            status: data.status,
            transaction_amount: data.transaction_amount,
            qr_code: qrData.qr_code || '',
            qr_code_base64: qrData.qr_code_base64 || '',
            date_of_expiration: data.date_of_expiration
        });

    } catch (error) {
        console.error('Erro PIX:', error.response?.data || error.message);
        return res.status(error.response?.status || 500).json({
            error: true,
            message: error.response?.data?.message || 'Erro ao criar PIX'
        });
    }
});

// Verificar pagamento
app.get('/api/verificar-pagamento/:id', async (req, res) => {
    try {
        const response = await axios.get(`${MP_API_URL}/${req.params.id}`, {
            headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` },
            timeout: 10000
        });

        return res.json({
            success: true,
            id: response.data.id,
            status: response.data.status,
            status_detail: response.data.status_detail
        });

    } catch (error) {
        console.error('Erro verificação:', error.message);
        return res.status(500).json({ error: true, message: 'Erro ao verificar' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'online', gateway: 'Mercado Pago' });
});

// Servir index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Iniciar
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`💳 Gateway: Mercado Pago`);
});
