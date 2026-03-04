# Deploy – Air Watch (Sistema Joice)

## Pré-requisitos

- **Backend**: Node 18+, banco SQLite (ou ajustar `DATABASE_URL` para PostgreSQL em produção)
- **Frontend**: build estático; precisa da URL do backend no build

## Variáveis de ambiente

### Backend

| Variável      | Obrigatória | Descrição |
|---------------|-------------|-----------|
| `PORT`        | Não (default 4000) | Porta do servidor |
| `DATABASE_URL`| **Sim**     | Ex.: `file:./prisma/dev.db` (SQLite) ou connection string PostgreSQL |
| `JWT_SECRET`  | **Sim**     | Chave secreta para tokens JWT (gerar valor aleatório forte) |
| `UPLOAD_DIR`  | Não        | Pasta de uploads (default: `./uploads`). Em produção use caminho persistente (ex.: volume/disco). |

### Frontend (no momento do build)

| Variável       | Obrigatória | Descrição |
|----------------|-------------|-----------|
| `VITE_API_URL` | **Sim** em produção | URL completa do backend (ex.: `https://sua-api.onrender.com`). Sem isso, o frontend usa `http://hostname:4000`. |

## Build local (teste antes do deploy)

```bash
# Backend
cd backend
npm ci
npm run build
# Rodar: npm run start (aplica migrações e sobe o servidor)

# Frontend (definir VITE_API_URL se for testar apontando para API de produção)
cd frontend
npm ci
VITE_API_URL=https://sua-api.exemplo.com npm run build
# Saída em frontend/dist
```

## Deploy no Render (render.yaml)

O repositório já inclui `render.yaml` com:

- **Backend**: serviço web Node, disco para SQLite e uploads, `prisma migrate deploy` antes do start.
- **Frontend**: site estático; pasta publicada = `dist`.

**Importante no Render:**

1. **Backend**: configurar no painel (ou no `render.yaml`):
   - `DATABASE_URL`: ex. `file:/var/data/dev.db` (com disco montado em `/var/data`).
   - `JWT_SECRET`: gerar um valor seguro (o `generateValue: true` no yaml já pode gerar).
   - `UPLOAD_DIR`: ex. `/var/data/uploads` (persistente no disco).

2. **Frontend**: na configuração do **Static Site** do frontend, definir:
   - `VITE_API_URL` = URL do backend (ex.: `https://sistema-joice-backend.onrender.com`).
   Isso é usado **no build**; sem isso, o app tentará falar com `http://<host>:4000`.

3. Ordem sugerida: fazer deploy do **backend** primeiro, copiar a URL e então configurar `VITE_API_URL` e fazer o deploy do **frontend**.

## Checklist rápido

- [ ] Backend: `DATABASE_URL`, `JWT_SECRET`, `UPLOAD_DIR` (se usar disco)
- [ ] Migrações aplicadas (`prisma migrate deploy` no start já cobre)
- [ ] Frontend: `VITE_API_URL` definida no ambiente de build
- [ ] Uploads em diretório persistente (disco/volume) no backend
- [ ] HTTPS na frente do backend (Render já fornece)

Com isso, o sistema está pronto para deploy com as funcionalidades atuais.
