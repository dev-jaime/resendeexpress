// js/session.js
// controla sessionStorage para manter company autenticada

const SESSION_KEY = 'resende_company';

export const Session = {
  save(companyObj) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(companyObj));
  },
  load() {
    const s = sessionStorage.getItem(SESSION_KEY);
    return s ? JSON.parse(s) : null;
  },
  clear() {
    sessionStorage.removeItem(SESSION_KEY);
  }
};

// Também disponibiliza globalmente para arquivos que não usam import
window.Session = Session;
