// js/crud.js
// funções utilitárias para operar em collections path completos.
// Ex: 'companies/{companyId}/products'

const {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} = window.Firebase;

export const CRUD = {
  // read once (array of docs)
    async read(collectionPath, orderField = 'createdAt') {
      const colRef = collectionPathToRef(collectionPath);
      try {
        const q = orderField ? query(colRef, orderBy(orderField)) : colRef;
        const snap = await getDocs(q);

        if (snap.empty) return []; // garante retorno consistente

        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (err) {
        console.error('CRUD.read', err);
        throw err;
      }
  },

  // subscribe to changes, returns unsubscribe function
  subscribe(collectionPath, callback, orderField = 'createdAt') {
    const colRef = collectionPathToRef(collectionPath);
    const q = orderField ? query(colRef, orderBy(orderField)) : colRef;
    return onSnapshot(q, (snap) => {
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(arr);
    }, (err) => {
      console.error('subscribe error', err);
    });
  },

  async create(collectionPath, data = {}, customIdTimestamp = true) {
    const colRef = collectionPathToRef(collectionPath);
    const payload = { ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
     };

    try {
      let res, customId;

      if (customIdTimestamp) {
        // gera ID com timestamp
        customId = `${collectionPath.split('/').pop()}${Date.now()}`;
        const ref = doc(colRef, customId); // cria referência com ID customizado
        await setDoc(ref, payload);        // cria documento
        res = { id: customId };            // simula retorno
      } else {
        // cria documento com ID automático
        res = await addDoc(colRef, payload);
      }

      return { id: res.id || customId, ...payload };
    } catch (err) {
      console.error('CRUD.create', err);
      throw err;
    }
  },

  async update(collectionPath, id, data = {}) {
    const ref = doc(db, collectionPath, id);
    const payload = {
      ...data,
      updatedAt: serverTimestamp(), // define timestamp do servidor
    };

    try {
      await updateDoc(ref, payload);
      return true;
    } catch (err) {
      console.error("CRUD.update", err);
      throw err;
    }
  },

  async delete(collectionPath, id) {
    const ref = doc(db, collectionPath, id);
    await deleteDoc(ref);
    return true;
  }

};

function collectionPathToRef(path) {
  // path = "companies/XYZ/customers"
  const parts = path.split('/');
  if (parts.length % 2 === 0) {
    // número par → é um doc? usar collection do parent
    const docPath = parts.slice(0, -1).join('/');
    return collection(db, docPath, parts[parts.length - 1]);
  } else {
    return collection(db, ...parts);
  }
}


// expose globally
window.CRUD = CRUD;
