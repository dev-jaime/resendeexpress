// js/auth.js
// Depende de window.Firebase and window.Session
// Login por CNPJ + ownerId. Procura em companies.
// Tenta consultar por número e por string (se tipo no banco for diferente).

const { db, collection, query, where, getDocs } = window.Firebase;
const cmpCollection = collection(db, 'companies');

const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginMessage.textContent = '';
    const cnpjRaw = document.getElementById('cnpj').value.trim();
    const ownerId = document.getElementById('ownerId').value.trim();
    if (!cnpjRaw || !ownerId) {
      loginMessage.textContent = 'Preencha os dois campos.';
      return;
    }

    // Normaliza: só números
    const cnpjNumbers = cnpjRaw.replace(/\D/g, '');

    loginMessage.textContent = 'Verificando...';

    try {
      // 1) Tenta buscar com CNPJ numérico (Number)
      let found = null;

      // When cnpj in DB might be stored as number, query with Number
      const tryNumber = !Number.isNaN(Number(cnpjNumbers));
      if (tryNumber) {
        const qnum = query(cmpCollection, where('cnpj', '==', Number(cnpjNumbers)), where('ownerId', '==', ownerId));
        const snap = await getDocs(qnum);
        if (!snap.empty) found = snap.docs[0];
      }

      // 2) Se não achou, tenta como string (texto)
      if (!found) {
        const qstr = query(cmpCollection, where('cnpj', '==', cnpjNumbers), where('ownerId', '==', ownerId));
        const snap2 = await getDocs(qstr);
        if (!snap2.empty) found = snap2.docs[0];
      }

      if (!found) {
        loginMessage.textContent = 'Credenciais inválidas.';
        return;
      }

      const company = { id: found.id, ...(found.data ? found.data() : found._document?.data) };
      // Salva no session
      window.Session.save(company);
      loginMessage.textContent = 'Autenticado. Redirecionando...';
      // redireciona pro painel
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 600);

    } catch (err) {
      console.error('Erro no login', err);
      loginMessage.textContent = 'Erro ao autenticar. Abra console.';
    }
  });
}
