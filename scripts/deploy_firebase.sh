#!/bin/bash

# Script para deploy rápido no Firebase Hosting
echo ""
echo "=== Iniciando deploy no Firebase Hosting..."
npx firebase deploy --only hosting
echo ""
echo "✔  Deploy concluído!"
echo ""
