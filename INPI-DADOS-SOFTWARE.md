# Dados do software para registro no INPI

Use as informações abaixo para preencher o pedido de registro de programa de computador no INPI. Ajuste datas, autores e titular conforme seu caso.

---

## 1. Dados do software

| Campo | Informação |
|-------|------------|
| **Título** | Air Watch – Sistema de Monitoramento da Qualidade do Ar Interior |
| **Linguagem(ns) de programação** | TypeScript, JavaScript, HTML, CSS, SQL (Prisma) |
| **Resumo técnico** | Aplicação web para medição e gestão da qualidade do ar interior, com critérios de conformidade conforme ABNT NBR 17037: relatórios (PDF/Excel), dashboard, cadastro de instituições, setores e medições (temperatura, umidade, CO₂, fungos, bactérias, PM10, PM2.5, velocidade do ar, etc.). Backend em Node.js (Express), frontend em React (Vite), banco de dados SQLite/Prisma. |
| **Campo de aplicação** | Meio ambiente; qualidade do ar interior; monitoramento ambiental; conformidade normativa (ABNT NBR 17037); gestão de instituições e setores (hospitais, universidades, etc.). |
| **Data de criação** | *(preencher – ex.: dia/mês/ano em que o desenvolvimento foi iniciado ou concluído)* |
| **Data de publicação** | *(preencher – ex.: primeira disponibilização ou implantação; se ainda não publicou, pode informar “Não publicado” ou a data prevista, conforme orientação do INPI)* |

---

## 2. Código-fonte – Hash SHA-256

O INPI não exige o envio do código inteiro, mas o **hash (assinatura) do arquivo ZIP** que contém o código-fonte.

### Como gerar o ZIP e o hash

**No macOS ou Linux**, na raiz do projeto (pasta onde estão as pastas `frontend` e `backend`):

```bash
bash scripts/gerar-hash-inpi.sh
```

Serão gerados:

- o arquivo **`codigo-fonte-airwatch.zip`** (código-fonte, sem `node_modules`, `dist`, `.env`, etc.);
- o **hash SHA-256** no terminal.

**No Windows** (PowerShell), na raiz do projeto:

```powershell
# Criar ZIP (excluindo pastas/arquivos desnecessários)
Compress-Archive -Path backend, frontend, scripts, .gitignore, render.yaml, DEPLOY.md, INPI-DADOS-SOFTWARE.md -DestinationPath codigo-fonte-airwatch.zip -Force

# Calcular SHA-256
Get-FileHash -Path codigo-fonte-airwatch.zip -Algorithm SHA256 | Select-Object -ExpandProperty Hash
```

Informe no pedido do INPI o **hash SHA-256** exatamente como gerado (uma única linha, sem espaços).

Guarde o arquivo **`codigo-fonte-airwatch.zip`** e o **hash** para eventual solicitação do INPI ou comprovação.

---

## 3. Autor(es) e titular(es)

*(Preencher conforme o INPI)*

| Tipo | CPF/CNPJ | Nome completo (ou razão social) | Endereço |
|------|-----------|----------------------------------|----------|
| Autor 1 | | | |
| Titular | | | |

**Observação:** Se o criador for funcionário, o INPI pode exigir documento de cessão de direitos (ex.: contrato ou declaração da empresa). Consulte o edital e o site do INPI.

---

## 4. Declaração de veracidade

- Deve ser **gerada no site do INPI** e **assinada digitalmente** (certificado digital) pelo titular ou procurador.
- Não é um documento que o projeto gera; é preenchido e assinado no próprio sistema do INPI.

---

## 5. Resumo das tecnologias (referência)

- **Backend:** Node.js, Express, TypeScript, Prisma (ORM), SQLite, JWT, Multer, PDFKit, ExcelJS.
- **Frontend:** React, TypeScript, Vite, Material UI (MUI), Chart.js, React Router, i18next (pt/en/es).
- **Norma:** ABNT NBR 17037 (qualidade do ar interior).

*(O INPI pede “linguagem de programação”; use o que consta na tabela do item 1.)*
