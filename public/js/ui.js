// js/ui.js
// Carrega painel, menus, manipula views pra customers/products (CRUD)
// depende de window.Session, window.CRUD, window.Firebase

const UI = {
  init() {
    const company = window.Session.load();
    if (!company) {
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
    this.menuButtons.forEach(btn =>
      btn.addEventListener('click', () => this.setView(btn.dataset.view))
    );

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
    this.content.innerHTML = '<div class="loading">Carregando...</div>';

    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    switch (viewName) {
      case 'customers': this.loadCustomers(); break;
      case 'products': this.loadProducts(); break;
      case 'orders': this.loadOrders(); break;
      case 'carts': this.loadCarts(); break;
    }
  },

  // =====================
  // CUSTOMERS CRUD
  // =====================
  loadCustomers() {
    const path = `${this.companyPath}/customers`;
    this.content.innerHTML = `
      <div class="panel">
        <div class="panel-left" id="listPane"></div>
        <div class="panel-right" id="formPane"></div>
      </div>
    `;
    this.panelEl = this.content.querySelector('.panel');
    this.renderCustomerForm();

    this.unsubscribe = window.CRUD.subscribe(path, arr => {
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

        ${this.addressGroupsHtml()}

        <div class="form-actions">
          <button type="submit" class="btn primary">${data ? 'Salvar' : 'Criar'}</button>
          ${data ? '<button type="button" id="delCustomer" class="btn danger">Remover</button>' : ''}
          <button type="button" id="cancelCustomer" class="btn outline">Cancelar</button>
        </div>
      </form>
    `;

    const form = document.getElementById('customerForm');

    // Focus → colapsa lista
    form.querySelectorAll('input, textarea, select').forEach(el => {
      el.addEventListener('focus', () => {
        this.panelEl.classList.add('list-collapsed');
        this.panelEl.classList.remove('form-collapsed');
      });
    });

    // Preenche dados (edição)
    if (data) this.fillCustomerForm(form, data);

    document.getElementById('cancelCustomer').addEventListener('click', () => {
      this.renderCustomerForm();
      this.panelEl.classList.remove('list-collapsed', 'form-collapsed');
    });

    form.addEventListener('submit', async e => {
      e.preventDefault();

      const payload = this.collectCustomerData(form);
      const path = `${this.companyPath}/customers`;

      try {
        if (data) {
          await window.CRUD.update(path, data.id, payload);
          this.renderCustomerForm();
        } else {
          await window.CRUD.create(path, payload, true);
          form.reset();
        }
      } catch (err) {
        console.error('Erro ao salvar cliente:', err);
        alert('Erro ao salvar cliente. Verifique o console.');
      }

      this.panelEl.classList.remove('list-collapsed', 'form-collapsed');
    });

    if (data) {
      document.getElementById('delCustomer').addEventListener('click', async () => {
        if (!confirm('Remover cliente?')) return;
        const path = `${this.companyPath}/customers`;
        await window.CRUD.delete(path, data.id);
        this.renderCustomerForm();
      });
    }

    this.initAddressCollapsibles(form);
  },

  addressGroupsHtml() {
    const sections = ['padrão', 'alternativo', 'envio', 'cobrança'];
    const keys = ['def', 'alt', 'ship', 'bill'];

    return sections.map((label, i) => `
      <fieldset class="address-group">
        <legend>Endereço ${label}</legend>
        <label>Rua</label><input name="${keys[i]}_street" />
        <label>Número</label><input type="number" name="${keys[i]}_number" />
        <label>Bairro</label><input name="${keys[i]}_neighborhood" />
        <label>Cidade</label><input name="${keys[i]}_city" />
        <label>Estado</label><input name="${keys[i]}_state" />
        <label>CEP</label><input name="${keys[i]}_zip" />
      </fieldset>
    `).join('');
  },

  fillCustomerForm(form, data) {
    form.elements['name'].value = data.name || '';
    form.elements['phone'].value = data.phone || '';
    form.elements['cpf'].value = data.cpf || '';

    const addrMap = {
      def: data.defaultAddress || {},
      alt: data.alternateAddress || {},
      ship: data.shippingAddress || {},
      bill: data.billingAddress || {}
    };

    for (const [prefix, obj] of Object.entries(addrMap)) {
      for (const field of ['street', 'number', 'neighborhood', 'city', 'state', 'zip']) {
        form.elements[`${prefix}_${field}`].value = obj[field] || '';
      }
    }
  },

  collectCustomerData(form) {
    const getAddr = (prefix) => ({
      street: form.elements[`${prefix}_street`].value.trim(),
      number: Number(form.elements[`${prefix}_number`].value || 0),
      neighborhood: form.elements[`${prefix}_neighborhood`].value.trim(),
      city: form.elements[`${prefix}_city`].value.trim(),
      state: form.elements[`${prefix}_state`].value.trim(),
      zip: form.elements[`${prefix}_zip`].value.trim(),
    });

    return {
      name: form.elements['name'].value.trim(),
      phone: form.elements['phone'].value.trim(),
      cpf: form.elements['cpf'].value.trim(),
      defaultAddress: getAddr('def'),
      alternateAddress: getAddr('alt'),
      shippingAddress: getAddr('ship'),
      billingAddress: getAddr('bill'),
    };
  },

  initAddressCollapsibles(form) {
    const groups = Array.from(form.querySelectorAll('.address-group'));
    groups.forEach((g, i) => {
      const legend = g.querySelector('legend');
      if (!legend) return;
      legend.style.cursor = 'pointer';
      if (i === 0) {
        g.classList.remove('collapsed');
        legend.setAttribute('aria-expanded', 'true');
      } else {
        g.classList.add('collapsed');
        legend.setAttribute('aria-expanded', 'false');
      }
      legend.addEventListener('click', () => {
        const isCollapsed = g.classList.toggle('collapsed');
        legend.setAttribute('aria-expanded', String(!isCollapsed));
      });
    });
  },

  renderCustomerList(arr) {
    const listPane = document.getElementById('listPane');

    if (!arr.length) {
      listPane.innerHTML = '<div class="muted">Nenhum cliente cadastrado.</div>';
      return;
    }

    const formatAddr = (addr) => {
      if (!addr) return '—';
      const parts = [
        addr.street || '',
        addr.number ? `, nº ${addr.number}` : '',
        addr.neighborhood ? `, ${addr.neighborhood}` : '',
        addr.city ? ` - ${addr.city}` : '',
        addr.state ? `/${addr.state}` : '',
        addr.zip ? ` CEP ${addr.zip}` : ''
      ].filter(Boolean).join('');
      return parts || '—';
    };

    listPane.innerHTML = arr.map(c => `
      <div class="list-item" data-id="${c.id}">
        <div class="list-header">
          <div>
            <div class="item-title">${escapeHtml(c.name || '—')}</div>
            <div class="item-sub">📞 ${escapeHtml(c.phone || '—')}</div>
          </div>
          <div class="item-actions">
            <button class="btn small" data-action="edit">Editar</button>
          </div>
        </div>
        <div class="list-details">
          <div><strong>CPF:</strong> ${escapeHtml(c.cpf || '—')}</div>
          <div><strong>Endereço principal:</strong> ${escapeHtml(formatAddr(c.defaultAddress))}</div>
          <div><strong>Endereço alternativo:</strong> ${escapeHtml(formatAddr(c.alternateAddress))}</div>
          <div><strong>Endereço de envio:</strong> ${escapeHtml(formatAddr(c.shippingAddress))}</div>
          <div><strong>Endereço de cobrança:</strong> ${escapeHtml(formatAddr(c.billingAddress))}</div>
          <div><strong>Criado em:</strong> ${c.createdAt ? new Date(c.createdAt).toLocaleString() : '—'}</div>
        </div>
      </div>
    `).join('');

    // toggle abrir/fechar
    listPane.querySelectorAll('.list-item').forEach(item => {
      const header = item.querySelector('.list-header');
      header.addEventListener('click', e => {
        if (e.target.closest('button[data-action="edit"]')) return;
        const isOpen = item.classList.contains('open');
        listPane.querySelectorAll('.list-item.open').forEach(other => other.classList.remove('open'));
        if (!isOpen) item.classList.add('open');
        this.panelEl.classList.add('form-collapsed');
        this.panelEl.classList.remove('list-collapsed');
      });
    });

    // botão editar
    listPane.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.closest('.list-item').dataset.id;
        const doc = arr.find(x => x.id === id);
        this.renderCustomerForm(doc);
        this.panelEl.classList.add('list-collapsed');
        this.panelEl.classList.remove('form-collapsed');
      });
    });
  },

  // =====================
  // PRODUCTS CRUD
  // =====================
  loadProducts() {
    const path = `${this.companyPath}/products`;
    this.content.innerHTML = `
      <div class="panel">
        <div class="panel-left" id="listPane"></div>
        <div class="panel-right" id="formPane"></div>
      </div>
    `;
    this.renderProductForm();
    this.unsubscribe = window.CRUD.subscribe(path, arr => this.renderProductList(arr), 'name');
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

  // =====================
  // ORDERS (visual)
  // =====================
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

  // =====================
  // CARTS (visual)
  // =====================
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
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

function formatCnpj(c) {
  if (!c) return '—';
  const s = String(c).replace(/\D/g, '').padStart(14, '0');
  return `${s.substr(0,2)}.${s.substr(2,3)}.${s.substr(5,3)}/${s.substr(8,4)}-${s.substr(12,2)}`;
}

// expose UI globally
window.UI = UI;