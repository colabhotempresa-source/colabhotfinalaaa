const express = require('express');
const path = require('path');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para JSON
app.use(express.json());

// Servir arquivos estáticos da raiz
app.use(express.static(__dirname));

// Rota da API SigiloPay (Proxy)
app.post('/api/sigilopay', async (req, res) => {
  const SIGILOPAY_BASE_URL = 'https://app.sigilopay.com.br/api/v1';
  const SIGILOPAY_PUBLIC_KEY = 'lpaulohenrique93_hee5m0vbs0kql17b';
  const SIGILOPAY_PRIVATE_KEY = '6lkh4unb7gvsha7bhbg22tkq2e5sc7gojw6te0o6cp0bqjobhby3d10oygbduq3w';

  try {
    const { path: apiPath, method, body: reqBody } = req.body || {};

    if (!apiPath) {
      return res.status(400).json({ error: 'Campo "path" obrigatório.' });
    }

    const config = {
      method: method || 'GET',
      url: SIGILOPAY_BASE_URL + apiPath,
      headers: {
        'Content-Type': 'application/json',
        'x-public-key': SIGILOPAY_PUBLIC_KEY,
        'x-secret-key': SIGILOPAY_PRIVATE_KEY,
      },
      data: reqBody && method !== 'GET' ? reqBody : undefined
    };

    const response = await axios(config);
    return res.status(response.status).json(response.data);

  } catch (err) {
    console.error('Erro no proxy:', err.message);
    const status = err.response ? err.response.status : 500;
    const data = err.response ? err.response.data : { error: 'Erro interno no proxy: ' + err.message };
    return res.status(status).json(data);
  }
});

// Fallback para index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
