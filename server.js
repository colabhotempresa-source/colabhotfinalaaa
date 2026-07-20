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
app.options('/api/sigilopay', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, x-public-key, x-secret-key');
  res.status(204).end();
});

// Rota da API SigiloPay (Proxy)
app.post('/api/sigilopay', async (req, res) => {
  // Headers CORS
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, x-public-key, x-secret-key');

  // ========== CONFIGURAÇÃO DO SIGILOPAY ==========
  // URLs possíveis do SigiloPay (teste cada uma)
  const SIGILOPAY_BASE_URLS = [
    'https://api.sigilopay.com.br/v1',
    'https://api.sigilopay.com/v1',
    'https://gateway.sigilopay.com.br/api/v1',
    'https://app.sigilopay.com.br/api/v1',
    'https://sigilopay.com.br/api/v1'
  ];

  // Suas credenciais
  const PUBLIC_KEY = 'lpaulohenrique93_hee5m0vbs0kql17b';
  const PRIVATE_KEY = '6lkh4unb7gvsha7bhbg22tkq2e5sc7gojw6te0o6cp0bqjobhby3d10oygbduq3w';

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
    }

    console.log('📤 Enviando para SigiloPay:', {
      path: apiPath,
      method: method || 'GET',
      payload: cleanedBody ? JSON.stringify(cleanedBody).substring(0, 200) : null
    });

    // Tentar cada URL base até uma funcionar
    let lastError = null;
    
    for (const BASE_URL of SIGILOPAY_BASE_URLS) {
      try {
        const config = {
          method: method || 'GET',
          url: BASE_URL + apiPath,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'ColabHotPro/1.0',
            'Origin': 'https://colabhotpro.com.br',
            // Tentar diferentes formatos de autenticação
            'x-public-key': PUBLIC_KEY,
            'x-secret-key': PRIVATE_KEY,
            'x-api-key': PRIVATE_KEY,
            'Authorization': `Bearer ${PRIVATE_KEY}`,
          },
          data: cleanedBody,
          timeout: 30000,
          validateStatus: function (status) {
            return status < 500; // Aceitar todos os status < 500
          }
        };

        const response = await axios(config);
        
        console.log(`✅ Resposta da SigiloPay (${BASE_URL}):`, {
          status: response.status,
          dataPreview: JSON.stringify(response.data).substring(0, 300)
        });

        // Se chegou aqui, a URL funcionou
        return res.status(response.status).json(response.data);

      } catch (err) {
        console.log(`❌ Falha ao tentar ${BASE_URL}:`, err.message);
        lastError = err;
        
        // Se não for erro 403/404, pode ser problema de autenticação
        if (err.response && err.response.status !== 403 && err.response.status !== 404) {
          return res.status(err.response.status).json(err.response.data);
        }
        // Continua para próxima URL
      }
    }

    // Se todas as URLs falharam
    console.error('❌ Todas as URLs do SigiloPay falharam');
    
    // Tentar uma última vez com configuração alternativa
    try {
      const fallbackUrl = 'https://api.sigilopay.com.br/v1' + apiPath;
      const fallbackConfig = {
        method: method || 'GET',
        url: fallbackUrl,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; ColabHotPro/1.0)',
          'x-public-key': PUBLIC_KEY,
          'x-secret-key': PRIVATE_KEY,
        },
        data: cleanedBody,
        timeout: 30000
      };
      
      const fallbackResponse = await axios(fallbackConfig);
      console.log('✅ Resposta do fallback:', fallbackResponse.status);
      return res.status(fallbackResponse.status).json(fallbackResponse.data);
      
    } catch (fallbackErr) {
      console.error('❌ Fallback também falhou:', fallbackErr.message);
      
      return res.status(502).json({
        error: 'Não foi possível conectar ao gateway de pagamento. Tente novamente em instantes.',
        success: false,
        details: lastError ? lastError.message : 'Erro desconhecido'
      });
    }

  } catch (err) {
    console.error('❌ Erro no proxy:', {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data ? JSON.stringify(err.response.data).substring(0, 200) : null
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
  console.log(`🔑 Public Key configurada: ${PUBLIC_KEY ? 'SIM' : 'NÃO'}`);
  console.log(`🔑 Private Key configurada: ${PRIVATE_KEY ? 'SIM' : 'NÃO'}`);
});
