#!/bin/bash

if git diff-index --quiet HEAD --; then
    echo ""
    echo "🔹 Nenhuma alteração para commitar."
    echo ""
else
    # Adiciona alterações (modificadas e novas)
    git add .
    # Commit automático com data/hora
    git commit -m "Auto commit de alterações $(date '+%Y-%m-%d %H:%M:%S')"
    # Envia para o GitHub
    git push
    echo ""
    echo "✔  Deploy concluído!"
    echo ""
fi
