#!/bin/bash

# Script para deploy rápido no Firebase Hosting

echo "Iniciando deploy no Firebase Hosting..."
npx firebase deploy --only hosting
echo "Deploy concluído!"
