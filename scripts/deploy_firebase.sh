#!/bin/bash

# Script para deploy rápido no Firebase Hosting
echo ""
echo "=== Iniciando deploy no Firebase Hosting..."
npx firebase deploy --only hosting
echo ""
echo -e "\e[32m✔  Deploy concluído!\e[0m"
echo ""
