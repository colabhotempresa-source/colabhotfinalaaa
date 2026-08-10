// api/mercadopago.js
// Proxy para Mercado Pago

const MP_ACCESS_TOKEN = 'APP_USR-8797267091485744-080614-3628865a23abc1d781f9b5ba94633ab4-3361822415';
const MP_API_URL = 'https://api.mercadopago.com/v1/payments';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    // Rota para criar PIX
    if (req.method === 'POST' && req.url === '/api/criar-pix') {
      const { transaction_amount, description, payer } = req.body;

      if (!transaction_amount || !payer?.email) {
        return res.status(400).json({ 
          error: true, 
          message: 'Dados incompletos' 
        });
      }

      const response = await fetch(MP_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `pix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        },
        body: JSON.stringify({
          transaction_amount: Number(transaction_amount),
          description: description || 'Produto COLAB HOT PRO',
          payment_method_id: 'pix',
          payer: {
            email: payer.email,
            first_name: payer.first_name || 'Cliente',
            last_name: payer.last_name || '',
            identification: {
              type: 'CPF',
              number: payer.identification?.number || '00000000000'
            }
          }
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao criar PIX');
      }

      const qrData = data.point_of_interaction?.transaction_data || {};

      return res.json({
        success: true,
        id: data.id,
        status: data.status,
        qr_code: qrData.qr_code || '',
        qr_code_base64: qrData.qr_code_base64 || ''
      });
    }

    // Rota para verificar pagamento
    if (req.method === 'GET' && req.url.startsWith('/api/verificar-pagamento/')) {
      const paymentId = req.url.split('/').pop();

      const response = await fetch(`${MP_API_URL}/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao verificar');
      }

      return res.json({
        success: true,
        id: data.id,
        status: data.status,
        status_detail: data.status_detail
      });
    }

    return res.status(404).json({ error: 'Rota não encontrada' });

  } catch (error) {
    console.error('Erro Mercado Pago:', error);
    return res.status(500).json({ 
      error: true, 
      message: error.message || 'Erro interno' 
    });
  }
}