// js/ui.js
// Carrega painel, menus, manipula views pra customers/products (CRUD)
// depende de window.Session, window.CRUD, window.Firebase

const UI = {
  init() {
    // checa sessão
    const company = window.Session.load();
    if (!company) {
      // não autenticado
      window.location.href = 'index.html';
      return;
    }

    this.company = company;
    this.companyPath = `companies/${company.id}`;
    this.cacheEls();
    this.bind();
    this.renderHeader();
    this.setView('customers'); // inicial
  },

  cacheEls() {
    this.companyNameEl = document.getElementById('companyName');
    this.companyCnpjEl = document.getElementById('companyCnpj');
    this.pageTitleEl = document.getElementById('pageTitle');
    this.statusBar = document.getElementById('statusBar');
    this.content = document.getElementById('content');
    this.menuButtons = Array.from(document.querySelectorAll('.menu-btn'));
    this.logoutBtn = document.getElementById('logoutBtn');
  },

  bind() {
    this.menuButtons.forEach(btn => btn.addEventListener('click', (e) => {
      const view = btn.dataset.view;
      this.setView(view);
    }));
    this.logoutBtn.addEventListener('click', () => {
      window.Session.clear();
      window.location.href = 'index.html';
    });
  },

  renderHeader() {
    this.companyNameEl.textContent = this.company.name || '—';
    this.companyCnpjEl.textContent = formatCnpj(this.company.cnpj);
    this.statusBar.textContent = `Conectado como ${this.company.ownerId || 'owner'}`;
  },

  setView(viewName) {
    this.view = viewName;
    this.pageTitleEl.textContent = viewLabel(viewName);
    // limpa content e carrega
    this.content.innerHTML = '<div class="loading">Carregando...</div>';
    if (this.unsubscribe) {
      this.unsubscribe(); // cancelar listener anterior
      this.unsubscribe = null;
    }

    if (viewName === 'customers') {
      this.loadCustomers();
    } else if (viewName === 'products') {
      this.loadProducts();
    } else if (viewName === 'orders') {
      this.loadOrders();
    } else if (viewName === 'carts') {
      this.loadCarts();
    }
  },

  // CUSTOMERS: CRUD completo
  loadCustomers() {
    const path = `${this.companyPath}/customers`;
    // mostra UI de list + form
    this.content.innerHTML = `
      <div class="panel">
        <div class="panel-left" id="listPane"></div>
        <div class="panel-right" id="formPane"></div>
      </div>
    `;
    this.renderCustomerForm(); // form vazio
    this.unsubscribe = window.CRUD.subscribe(path, (arr) => {
      this.renderCustomerList(arr);
    }, 'createdAt');
  },

  renderCustomerForm(data = null) {
    const formPane = document.getElementById('formPane');
    formPane.innerHTML = `
      <h3>${data ? 'Editar cliente' : 'Novo cliente'}</h3>
      <form id="customerForm" class="entity-form">
        <label>Nome</label><input name="name" required />
        <label>Telefone</label><input name="phone" />
        <label>CPF</label><input name="cpf" />
        <label>Endereço (JSON rápido)</label><textarea name="defaultAddress" rows="3" placeholder='{"street":"..."}'></textarea>
        <div class="form-actions">
          <button type="submit" class="btn primary">${data ? 'Salvar' : 'Criar'}</button>
          ${data ? '<button type="button" id="delCustomer" class="btn danger">Remover</button>' : ''}
          <button type="button" id="cancelCustomer" class="btn outline">Cancelar</button>
        </div>
      </form>
    `;
    const form = document.getElementById('customerForm');
    if (data) {
      form.elements['name'].value = data.name || '';
      form.elements['phone'].value = data.phone || '';
      form.elements['cpf'].value = data.cpf || '';
      form.elements['defaultAddress'].value = JSON.stringify(data.defaultAddress || {}, null, 0);
    }
    document.getElementById('cancelCustomer').addEventListener('click', () => this.renderCustomerForm());
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        name: form.elements['name'].value.trim(),
        phone: form.elements['phone'].value.trim(),
        cpf: form.elements['cpf'].value.trim(),
      };
      try {
        const addrTxt = form.elements['defaultAddress'].value.trim();
        payload.defaultAddress = addrTxt ? JSON.parse(addrTxt) : {};
      } catch (err) {
        alert('Endereço JSON inválido');
        return;
      }

      const path = `${this.companyPath}/customers`;
      if (data) {
        await window.CRUD.update(path, data.id, payload);
        this.renderCustomerForm();
      } else {
        await window.CRUD.create(path, payload);
        form.reset();
      }
    });

    if (data) {
      document.getElementById('delCustomer').addEventListener('click', async () => {
        if (!confirm('Remover cliente?')) return;
        const path = `${this.companyPath}/customers`;
        await window.CRUD.delete(path, data.id);
        this.renderCustomerForm();
      });
    }
  },

  renderCustomerList(arr) {
    const listPane = document.getElementById('listPane');
    if (!arr.length) {
      listPane.innerHTML = '<div class="muted">Nenhum cliente cadastrado.</div>';
      return;
    }
    listPane.innerHTML = arr.map(c => `
      <div class="list-item">
        <div>
          <div class="item-title">${escapeHtml(c.name || '—')}</div>
          <div class="item-sub">${escapeHtml(c.phone||'')} • ${escapeHtml(c.cpf||'')}</div>
        </div>
        <div class="item-actions">
          <button data-id="${c.id}" class="btn small" data-action="edit">Editar</button>
        </div>
      </div>
    `).join('');

    // bind edit
    listPane.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        // find doc in arr
        const doc = arr.find(x => x.id === id);
        this.renderCustomerForm(doc);
      });
    });
  },

  // PRODUCTS: CRUD completo
  loadProducts() {
    const path = `${this.companyPath}/products`;
    this.content.innerHTML = `
      <div class="panel">
        <div class="panel-left" id="listPane"></div>
        <div class="panel-right" id="formPane"></div>
      </div>
    `;
    this.renderProductForm();
    this.unsubscribe = window.CRUD.subscribe(path, (arr) => {
      this.renderProductList(arr);
    }, 'name');
  },

  renderProductForm(data = null) {
    const formPane = document.getElementById('formPane');
    formPane.innerHTML = `
      <h3>${data ? 'Editar produto' : 'Novo produto'}</h3>
      <form id="productForm" class="entity-form">
        <label>SKU</label><input name="sku" />
        <label>Nome</label><input name="name" required />
        <label>Preço (em centavos)</label><input type="number" name="priceCents" />
        <label>Estoque</label><input type="number" name="stock" />
        <label>Visibilidade</label><input name="visibility" placeholder="public/private" />
        <div class="form-actions">
          <button type="submit" class="btn primary">${data ? 'Salvar' : 'Criar'}</button>
          ${data ? '<button type="button" id="delProduct" class="btn danger">Remover</button>' : ''}
          <button type="button" id="cancelProduct" class="btn outline">Cancelar</button>
        </div>
      </form>
    `;
    const form = document.getElementById('productForm');
    if (data) {
      form.elements['sku'].value = data.sku || '';
      form.elements['name'].value = data.name || '';
      form.elements['priceCents'].value = data.priceCents || 0;
      form.elements['stock'].value = data.stock || 0;
      form.elements['visibility'].value = data.visibility || '';
    }
    document.getElementById('cancelProduct').addEventListener('click', () => this.renderProductForm());
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        sku: form.elements['sku'].value.trim(),
        name: form.elements['name'].value.trim(),
        priceCents: Number(form.elements['priceCents'].value || 0),
        stock: Number(form.elements['stock'].value || 0),
        visibility: form.elements['visibility'].value.trim()
      };
      const path = `${this.companyPath}/products`;
      if (data) {
        await window.CRUD.update(path, data.id, payload);
        this.renderProductForm();
      } else {
        await window.CRUD.create(path, payload);
        form.reset();
      }
    });

    if (data) {
      document.getElementById('delProduct').addEventListener('click', async () => {
        if (!confirm('Remover produto?')) return;
        const path = `${this.companyPath}/products`;
        await window.CRUD.delete(path, data.id);
        this.renderProductForm();
      });
    }
  },

  renderProductList(arr) {
    const listPane = document.getElementById('listPane');
    if (!arr.length) {
      listPane.innerHTML = '<div class="muted">Nenhum produto cadastrado.</div>';
      return;
    }
    listPane.innerHTML = arr.map(p => `
      <div class="list-item">
        <div>
          <div class="item-title">${escapeHtml(p.name || '—')}</div>
          <div class="item-sub">SKU ${escapeHtml(p.sku||'')} • R$ ${(Number(p.priceCents||0)/100).toFixed(2)} • estoque: ${escapeHtml(String(p.stock||0))}</div>
        </div>
        <div class="item-actions">
          <button data-id="${p.id}" class="btn small" data-action="edit">Editar</button>
        </div>
      </div>
    `).join('');

    listPane.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const doc = arr.find(x => x.id === id);
        this.renderProductForm(doc);
      });
    });
  },

  // ORDERS: somente visual
  async loadOrders() {
    const path = `${this.companyPath}/orders`;
    this.content.innerHTML = '<h3>Pedidos</h3><div id="ordersList">Carregando...</div>';
    const arr = await window.CRUD.read(path, 'createdAt');
    const list = document.getElementById('ordersList');
    if (!arr.length) return list.innerHTML = '<div class="muted">Nenhum pedido.</div>';
    list.innerHTML = arr.map(o => `
      <div class="card small">
        <div><strong>Pedido:</strong> ${escapeHtml(o.id)}</div>
        <div><strong>Cliente:</strong> ${escapeHtml(o.customerId||'—')}</div>
        <div><strong>Status:</strong> ${escapeHtml(o.status||'—')}</div>
        <div><strong>Total:</strong> R$ ${(Number(o.totalCents||0)/100).toFixed(2)}</div>
      </div>
    `).join('');
  },

  // CARTS: somente visual
  async loadCarts() {
    const path = `${this.companyPath}/carts`;
    this.content.innerHTML = '<h3>Carrinhos</h3><div id="cartsList">Carregando...</div>';
    const arr = await window.CRUD.read(path, 'createdAt');
    const list = document.getElementById('cartsList');
    if (!arr.length) return list.innerHTML = '<div class="muted">Nenhum carrinho.</div>';
    list.innerHTML = arr.map(c => `
      <div class="card small">
        <div><strong>Carrinho:</strong> ${escapeHtml(c.id)}</div>
        <div><strong>Cliente:</strong> ${escapeHtml(c.customerId||'—')}</div>
        <div><strong>Status:</strong> ${escapeHtml(c.status||'—')}</div>
      </div>
    `).join('');
  }
};

// helpers
function viewLabel(v) {
  return ({
    customers: 'Clientes',
    products: 'Produtos',
    orders: 'Pedidos',
    carts: 'Carrinhos'
  })[v] || v;
}

function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function formatCnpj(c) {
  if (!c) return '—';
  const s = String(c).replace(/\D/g, '').padStart(14, '0');
  return `${s.substr(0,2)}.${s.substr(2,3)}.${s.substr(5,3)}/${s.substr(8,4)}-${s.substr(12,2)}`;
}

// expose UI globally
window.UI = UI;
