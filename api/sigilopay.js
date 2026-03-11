// api/sigilopay.js
// Proxy seguro para a API da SigiloPay adaptado para Vercel

const SIGILOPAY_BASE_URL    = 'https://app.sigilopay.com.br/api/v1';
const SIGILOPAY_PUBLIC_KEY  = 'lpaulohenrique93_hee5m0vbs0kql17b';
const SIGILOPAY_PRIVATE_KEY = '6lkh4unb7gvsha7bhbg22tkq2e5sc7gojw6te0o6cp0bqjobhby3d10oygbduq3w';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const { path, method, body: reqBody } = req.body || {};

    if (!path) {
      return res.status(400).json({ error: 'Campo "path" obrigatório.' });
    }

    const fetchOpts = {
      method: method || 'GET',
      headers: {
        'Content-Type':  'application/json',
        'x-public-key':  SIGILOPAY_PUBLIC_KEY,
        'x-secret-key':  SIGILOPAY_PRIVATE_KEY,
      },
    };

    if (reqBody && method !== 'GET') {
      fetchOpts.body = JSON.stringify(reqBody);
    }

    const response = await fetch(SIGILOPAY_BASE_URL + path, fetchOpts);
    const text     = await response.text();

    let data;
    try { 
      data = JSON.parse(text); 
    } catch { 
      data = { raw: text }; 
    }

    return res.status(response.status).json(data);

  } catch (err) {
    return res.status(500).json({ error: 'Erro interno no proxy: ' + err.message });
  }
}
