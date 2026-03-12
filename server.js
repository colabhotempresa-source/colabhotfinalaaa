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

// Rota da API SigiloPay (Proxy)
app.post('/api/sigilopay', async (req, res) => {
  // Headers CORS
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const SIGILOPAY_BASE_URL = 'https://app.sigilopay.com.br/api/v1';
  const SIGILOPAY_PUBLIC_KEY = 'lpaulohenrique93_hee5m0vbs0kql17b';
  const SIGILOPAY_PRIVATE_KEY = '6lkh4unb7gvsha7bhbg22tkq2e5sc7gojw6te0o6cp0bqjobhby3d10oygbduq3w';

  try {
    const { path: apiPath, method, body: reqBody } = req.body || {};

    if (!apiPath) {
      return res.status(400).json({ 
        error: 'Campo "path" obrigatório.',
        success: false 
      });
    }

    // Validar e limpar o payload
    let cleanedBody = null;
    if (reqBody && method !== 'GET') {
      cleanedBody = sanitizePayload(reqBody);
      console.log('📤 Enviando para SigiloPay:', {
        path: apiPath,
        method: method,
        payload: cleanedBody
      });
    }

    const config = {
      method: method || 'GET',
      url: SIGILOPAY_BASE_URL + apiPath,
      headers: {
        'Content-Type': 'application/json',
        'x-public-key': SIGILOPAY_PUBLIC_KEY,
        'x-secret-key': SIGILOPAY_PRIVATE_KEY,
      },
      data: cleanedBody,
      timeout: 30000
    };

    const response = await axios(config);
    
    console.log('✅ Resposta da SigiloPay:', {
      status: response.status,
      data: response.data
    });

    return res.status(response.status).json(response.data);

  } catch (err) {
    console.error('❌ Erro no proxy:', {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data
    });

    const status = err.response ? err.response.status : 500;
    const errorData = err.response ? err.response.data : { 
      error: 'Erro interno no proxy: ' + err.message,
      success: false 
    };
    
    return res.status(status).json(errorData);
  }
});

// Função para sanitizar e validar o payload
function sanitizePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  const cleaned = {};

  // Copiar apenas campos válidos
  if (payload.identifier) cleaned.identifier = String(payload.identifier).trim();
  if (payload.amount !== undefined) {
    const amt = parseFloat(payload.amount);
    if (isNaN(amt) || amt <= 0) {
      throw new Error('Amount deve ser um número positivo');
    }
    cleaned.amount = parseFloat(amt.toFixed(2));
  }
  if (payload.description) cleaned.description = String(payload.description).trim();
  
  // Processar dados do cliente
  if (payload.client && typeof payload.client === 'object') {
    cleaned.client = {
      name: payload.client.name ? String(payload.client.name).trim() : undefined,
      email: payload.client.email ? String(payload.client.email).trim() : undefined,
      document: payload.client.document ? String(payload.client.document).replace(/\D/g, '') : undefined,
      phone: payload.client.phone ? String(payload.client.phone).replace(/\D/g, '') : undefined,
    };
    // Remover campos undefined
    Object.keys(cleaned.client).forEach(key => 
      cleaned.client[key] === undefined && delete cleaned.client[key]
    );
  }

  return cleaned;
}

// Fallback para index.html (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Tratamento de erros global
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    message: err.message,
    success: false 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📍 Acesse: http://localhost:${PORT}`);
});
