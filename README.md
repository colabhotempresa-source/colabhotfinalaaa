# COLAB HOT PRO

Ferramentas profissionais para Telegram com integração de pagamentos via SigiloPay.

## Estrutura do Projeto

```
.
├── index.html              # Página principal
├── api/
│   └── sigilopay.js       # Função serverless para proxy da API SigiloPay
├── vercel.json            # Configuração da Vercel
├── package.json           # Dependências do projeto
├── netlify.toml           # (Legado - não usar com Vercel)
├── img23.png              # Logo/Ícone
├── music2.mp3             # Música de fundo
└── qrcod.PNG              # Imagem de QR Code
```

## Deploy na Vercel via GitHub

### Pré-requisitos
- Conta no GitHub
- Conta na Vercel
- Node.js 18+ instalado localmente

### Passos para Deploy

1. **Criar repositório no GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/seu-usuario/seu-repo.git
   git branch -M main
   git push -u origin main
   ```

2. **Conectar à Vercel**
   - Acesse [vercel.com](https://vercel.com)
   - Clique em "New Project"
   - Selecione "Import Git Repository"
   - Escolha seu repositório do GitHub
   - Clique em "Import"

3. **Configurar Variáveis de Ambiente (Opcional)**
   - Se precisar adicionar variáveis secretas, vá em "Settings" > "Environment Variables"
   - As chaves da SigiloPay estão hardcoded no arquivo `api/sigilopay.js`

4. **Deploy Automático**
   - A Vercel fará deploy automático a cada push para a branch `main`

## Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Rodar servidor de desenvolvimento
npm run dev

# O site estará disponível em http://localhost:3000
# A API estará disponível em http://localhost:3000/api/sigilopay
```

## Funcionalidades

- ✅ Exibição de produtos com preços e descrições
- ✅ Geração de PIX via SigiloPay
- ✅ Redirecionamento automático para clonagram.com (Clonador e Espelhador)
- ✅ Verificação de pagamento em tempo real
- ✅ Suporte 24/7 via Telegram
- ✅ Responsivo e otimizado para mobile

## Integração com SigiloPay

A integração com a SigiloPay é feita através de uma função serverless que:
1. Recebe requisições do frontend
2. Autentica com as credenciais da SigiloPay
3. Encaminha para a API da SigiloPay
4. Retorna a resposta ao frontend

**Chaves da API:**
- Public Key: `lpaulohenrique93_hee5m0vbs0kql17b`
- Private Key: `6lkh4unb7gvsha7bhbg22tkq2e5sc7gojw6te0o6cp0bqjobhby3d10oygbduq3w`

## Troubleshooting

### Erro: "dados das requisições inválidas"
- Verifique se o payload está no formato correto
- Certifique-se de que o campo `identifier` é único por transação
- Valide os dados do cliente (nome, email, CPF, telefone)

### Erro: CORS
- A função `api/sigilopay.js` já possui headers CORS configurados
- Se ainda tiver problemas, verifique a configuração do `vercel.json`

### Função não encontrada
- Certifique-se de que o arquivo está em `api/sigilopay.js`
- Reinicie o servidor de desenvolvimento
- Faça um novo deploy na Vercel

## Suporte

Para dúvidas ou problemas, entre em contato via Telegram: [@suphotvip](https://t.me/suphotvip)

## Licença

MIT
