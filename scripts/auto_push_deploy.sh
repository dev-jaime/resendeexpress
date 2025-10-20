#!/bin/bash

# Script para commit, push e deploy automático no Firebase Hosting

if git diff-index --quiet HEAD --; then
    echo ""
    echo "\e[32m🔹 Nenhuma alteração para commitar.\e[0m"
else
    # Adiciona alterações (modificadas e novas)
    git add .
    # Commit automático com data/hora
    git commit -m "Auto commit de alterações $(date '+%Y-%m-%d %H:%M:%S')"
    # Envia para o GitHub
    git push
    echo ""
    echo -e "\e[34m✔  Commit concluído!\e[0m"
fi

# Deploy no Firebase Hosting
echo ""
echo "=== Iniciando deploy no Firebase Hosting..."
npx firebase deploy --only hosting
echo ""
echo -e "\e[32m✔  Deploy concluído!\e[0m"
echo ""