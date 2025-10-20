| ------------ | ---------------------------------------------------------------------- | ----------------------------- |
| Alias        | Ação                                                                   | Script executado              |
| ------------ | ---------------------------------------------------------------------- | ----------------------------- |
| `commitgh`   | Faz commit automático das alterações locais e envia ao GitHub.         | `scripts/auto_commit.sh`      |
| `deployfire` | Faz o deploy do site no Firebase Hosting.                              | `scripts/deploy_firebase.sh`  |
| `deployall`  | Faz commit e push para o GitHub **e depois** o deploy para o Firebase. | `scripts/auto_push_deploy.sh` |

Adicionando alias permanentemente
echo "alias commitgh='bash ./scripts/auto_commit.sh'" >> ~/.bashrc
depecho "alias deployfire='bash ./scripts/deploy_firebase.sh'" >> ~/.bashrc
echo "alias deployall='bash ./scripts/auto_push_deploy.sh'" >> ~/.bashrc
