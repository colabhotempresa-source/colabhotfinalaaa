// api/sigilopay.js
// Proxy seguro para a API da SigiloPay adaptado para Vercel

const SIGILOPAY_BASE_URL = 'https://app.sigilopay.com.br/api/v1';
const SIGILOPAY_PUBLIC_KEY = 'lpaulohenrique93_hee5m0vbs0kql17b';
const SIGILOPAY_PRIVATE_KEY = '6lkh4unb7gvsha7bhbg22tkq2e5sc7gojw6te0o6cp0bqjobhby3d10oygbduq3w';

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

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const { path, method, body: reqBody } = req.body || {};

    if (!path) {
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
        path: path,
        method: method,
        payload: cleanedBody
      });
    }

    const fetchOpts = {
      method: method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-public-key': SIGILOPAY_PUBLIC_KEY,
        'x-secret-key': SIGILOPAY_PRIVATE_KEY,
      },
    };

    if (cleanedBody && method !== 'GET') {
      fetchOpts.body = JSON.stringify(cleanedBody);
    }

    const response = await fetch(SIGILOPAY_BASE_URL + path, fetchOpts);
    const text = await response.text();

    let data;
    try { 
      data = JSON.parse(text); 
    } catch { 
      data = { raw: text }; 
    }

    console.log('✅ Resposta da SigiloPay:', {
      status: response.status,
      data: data
    });

    return res.status(response.status).json(data);

  } catch (err) {
    console.error('❌ Erro no proxy:', {
      message: err.message,
      stack: err.stack
    });

    return res.status(500).json({ 
      error: 'Erro interno no proxy: ' + err.message,
      success: false 
    });
  }
}
