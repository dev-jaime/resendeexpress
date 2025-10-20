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
  orderBy
} = window.Firebase;

export const CRUD = {
  // read once (array of docs)
  async read(collectionPath, orderField = 'createdAt') {
    const colRef = collectionPathToRef(collectionPath);
    try {
      if (orderField) {
        const q = query(colRef, orderBy(orderField));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } else {
        const snap = await getDocs(colRef);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
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

  async create(collectionPath, data = {}) {
    const colRef = collectionPathToRef(collectionPath);
    const payload = { ...data };
    // tenta adicionar campos de meta
    try {
      payload.createdAt = payload.createdAt || Date.now();
      const res = await addDoc(colRef, payload);
      return { id: res.id, ...payload };
    } catch (err) {
      console.error('CRUD.create', err);
      throw err;
    }
  },

  async update(collectionPath, docId, data = {}) {
    try {
      const docRef = doc(collectionPathToRef(collectionPath).path.split('/')[0] ? db : null, ...[]); // placeholder to satisfy linter
      // build reference
      const ref = doc(db, ...collectionPath.split('/').concat([docId]));
      const payload = { ...data, updatedAt: Date.now() };
      await updateDoc(ref, payload);
      return true;
    } catch (err) {
      console.error('CRUD.update', err);
      throw err;
    }
  },

  async set(collectionPath, docId, data = {}) {
    // set (merge)
    try {
      const ref = doc(db, ...collectionPath.split('/').concat([docId]));
      const payload = { ...data, updatedAt: Date.now() };
      await setDoc(ref, payload, { merge: true });
      return true;
    } catch (err) {
      console.error('CRUD.set', err);
      throw err;
    }
  },

  async delete(collectionPath, docId) {
    try {
      const ref = doc(db, ...collectionPath.split('/').concat([docId]));
      await deleteDoc(ref);
      return true;
    } catch (err) {
      console.error('CRUD.delete', err);
      throw err;
    }
  }
};

// helper para transformar string em ref
function collectionPathToRef(path) {
  // split path into segments and call collection sequentially
  // but since we export window.Firebase.collection which expects (db, path) we simply:
  // return collection(db, path) - works only for simple paths; Firestore modular supports nested paths too.
  return collection(db, ...path.split('/'));
}

// expose globally
window.CRUD = CRUD;
