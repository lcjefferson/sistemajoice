#!/usr/bin/env bash
# Gera o ZIP do código-fonte e o hash SHA-256 para registro no INPI.
# Executar na raiz do projeto: bash scripts/gerar-hash-inpi.sh

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
ZIP_NAME="codigo-fonte-airwatch.zip"

# Remove ZIP anterior se existir
rm -f "$ZIP_NAME"

# Cria ZIP apenas com código-fonte e arquivos de projeto (exclui node_modules, dist, .env, etc.)
zip -r "$ZIP_NAME" . \
  -x "*.git*" \
  -x "*node_modules*" \
  -x "*frontend/node_modules*" \
  -x "*backend/node_modules*" \
  -x "*frontend/dist*" \
  -x "*backend/dist*" \
  -x "*.env*" \
  -x "*backend/uploads/*" \
  -x "*.sqlite*" \
  -x "*dev.db*" \
  -x "*.sqlite-journal" \
  -x "*.log" \
  -x ".DS_Store" \
  -x "*/.DS_Store" \
  -x "*.pdf" \
  -x ".vite*" \
  -x "*backend/frontend*" \
  -x "$ZIP_NAME"

if command -v shasum &> /dev/null; then
  HASH=$(shasum -a 256 "$ZIP_NAME" | awk '{print $1}')
elif command -v sha256sum &> /dev/null; then
  HASH=$(sha256sum "$ZIP_NAME" | awk '{print $1}')
else
  echo "Instale shasum (macOS) ou sha256sum (Linux) para gerar o hash."
  exit 1
fi

echo ""
echo "=============================================="
echo "  REGISTRO INPI - CÓDIGO-FONTE"
echo "=============================================="
echo ""
echo "  Arquivo ZIP gerado: $ZIP_NAME"
echo "  Tamanho: $(du -h "$ZIP_NAME" | cut -f1)"
echo ""
echo "  Hash SHA-256 (informar no INPI):"
echo "  $HASH"
echo ""
echo "=============================================="
echo ""
echo "Guarde o arquivo $ZIP_NAME e o hash acima."
echo "O hash deve ser informado no pedido de registro."
echo ""
