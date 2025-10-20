#!/bin/bash

echo ""
echo "=> Iniciando commit no GitHub..."
echo ""
if git diff-index --quiet HEAD --; then
    echo ""
    echo -e "\e[34m 🔹 Nenhuma alteração para commitar.\e[0m"
    echo ""
else
    # Adiciona alterações (modificadas e novas)
    git add .
    # Commit automático com data/hora
    git commit -m "Auto commit de alterações $(date '+%Y-%m-%d %H:%M:%S')"
    # Envia para o GitHub
    git push
    echo ""
    echo -e "\e[32m✔  GitHub Commit concluído!\e[0m"
    echo ""
fi
