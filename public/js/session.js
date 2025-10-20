// js/session.js
// Controla sessionStorage para manter a empresa autenticada

const SESSION_KEY = 'resende_company';

export const Session = {
  /**
   * Salva o objeto da empresa no sessionStorage.
   * @param {Object} companyObj - Dados da empresa autenticada.
   * @param {number} [expiresInMinutes] - (opcional) Tempo de expiração da sessão em minutos.
   */
  save(companyObj, expiresInMinutes = null) {
    if (typeof companyObj !== 'object' || companyObj === null) {
      console.warn('Session.save: objeto inválido, nada foi salvo.');
      return;
    }

    const data = {
      company: companyObj,
      timestamp: Date.now(),
      expiresIn: expiresInMinutes ? expiresInMinutes * 60 * 1000 : null
    };

    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
    } catch (err) {
      console.error('Session.save: erro ao salvar sessão', err);
    }
  },

  /**
   * Carrega os dados da empresa autenticada, se ainda válidos.
   * @returns {Object|null} Objeto da empresa ou null se expirado/inválido.
   */
  load() {
    const s = sessionStorage.getItem(SESSION_KEY);
    if (!s) return null;

    try {
      const data = JSON.parse(s);

      // Verifica expiração (se configurada)
      if (data.expiresIn && Date.now() - data.timestamp > data.expiresIn) {
        console.warn('Sessão expirada. Limpando...');
        this.clear();
        return null;
      }

      return data.company || null;
    } catch (err) {
      console.error('Session.load: erro ao ler sessão', err);
      this.clear();
      return null;
    }
  },

  /**
   * Limpa a sessão atual.
   */
  clear() {
    sessionStorage.removeItem(SESSION_KEY);
  }
};

// Também disponibiliza globalmente para arquivos sem import
window.Session = Session;