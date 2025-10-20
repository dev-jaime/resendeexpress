#!/bin/bash

# Adiciona todos os arquivos alterados
git add .

# Cria commit com mensagem padrão
git commit -m "Auto commit de alterações $(date '+%Y-%m-%d %H:%M:%S')"

# Envia para o repositório remoto
git push
