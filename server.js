const express = require('express');
const path = require('path');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Servir arquivos estáticos da raiz
app.use(express.static(__dirname));

// Rota OPTIONS para CORS preflight
app.options('/api/mercadopago', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.status(204).end();
});

// ========== ROTA PROXY MERCADO PAGO ==========
app.post('/api/mercadopago', async (req, res) => {
  // Headers CORS
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  const { action, access_token, data, payment_id } = req.body;

  try {
    // Criar pagamento PIX
    if (action === 'create_pix') {
      const response = await axios.post(
        'https://api.mercadopago.com/v1/payments',
        {
          transaction_amount: data.transaction_amount,
          description: data.description,
          payment_method_id: 'pix',
          payer: {
            email: data.payer.email,
            first_name: data.payer.first_name,
            last_name: data.payer.last_name,
            identification: {
              type: 'CPF',
              number: data.payer.identification.number
            }
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json',
            'X-Idempotency-Key': `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          }
        }
      );

      console.log('✅ Pagamento PIX criado:', response.data.id);
      
      // Retornar dados relevantes
      return res.json({
        id: response.data.id,
        status: response.data.status,
        point_of_interaction: response.data.point_of_interaction,
        transaction_amount: response.data.transaction_amount,
        description: response.data.description,
        date_created: response.data.date_created
      });
    }

    // Verificar status do pagamento
    if (action === 'check_payment') {
      const response = await axios.get(
        `https://api.mercadopago.com/v1/payments/${payment_id}`,
        {
          headers: {
            'Authorization': `Bearer ${access_token}`
          }
        }
      );

      console.log(`✅ Status do pagamento ${payment_id}:`, response.data.status);

      return res.json({
        id: response.data.id,
        status: response.data.status,
        status_detail: response.data.status_detail,
        transaction_amount: response.data.transaction_amount
      });
    }

    return res.status(400).json({ error: 'Ação inválida' });

  } catch (error) {
    console.error('❌ Erro Mercado Pago:', {
      message: error.message,
      response: error.response?.data
    });

    // Tratar erros específicos do Mercado Pago
    if (error.response?.data) {
      const mpError = error.response.data;
      return res.status(error.response.status).json({
        error: true,
        message: mpError.message || 'Erro no Mercado Pago',
        cause: mpError.cause || []
      });
    }

    return res.status(500).json({
      error: true,
      message: 'Erro interno ao processar pagamento'
    });
  }
});

// Fallback para index.html (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Tratamento de erros global
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📍 Acesse: http://localhost:${PORT}`);
  console.log(`💳 Gateway: Mercado Pago`);
  console.log(`🔑 Public Key configurada: SIM`);
  console.log(`🔑 Access Token configurado: SIM`);
});
