#!/bin/bash

# Script para commit, push e deploy automático no Firebase Hosting

if git diff-index --quiet HEAD --; then
    echo "Nenhuma alteração para commitar."
else
    # Adiciona alterações (modificadas e novas)
    git add .
    # Commit automático com data/hora
    git commit -m "Auto commit de alterações $(date '+%Y-%m-%d %H:%M:%S')"
    # Envia para o GitHub
    git push
fi

# Deploy no Firebase Hosting
echo "Iniciando deploy no Firebase Hosting..."
npx firebase deploy --only hosting
echo "Deploy concluído!"
