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

        <fieldset class="address-group">
            <legend>Endereço padrão</legend>
            <label>Rua</label><input name="def_street" />
            <label>Número</label><input type="number" name="def_number" />
            <label>Bairro</label><input name="def_neighborhood" />
            <label>Cidade</label><input name="def_city" />
            <label>Estado</label><input name="def_state" />
            <label>CEP</label><input name="def_zip" />
        </fieldset>

        <fieldset class="address-group">
            <legend>Endereço alternativo</legend>
            <label>Rua</label><input name="alt_street" />
            <label>Número</label><input type="number" name="alt_number" />
            <label>Bairro</label><input name="alt_neighborhood" />
            <label>Cidade</label><input name="alt_city" />
            <label>Estado</label><input name="alt_state" />
            <label>CEP</label><input name="alt_zip" />
        </fieldset>

        <fieldset class="address-group">
            <legend>Endereço de envio</legend>
            <label>Rua</label><input name="ship_street" />
            <label>Número</label><input type="number" name="ship_number" />
            <label>Bairro</label><input name="ship_neighborhood" />
            <label>Cidade</label><input name="ship_city" />
            <label>Estado</label><input name="ship_state" />
            <label>CEP</label><input name="ship_zip" />
        </fieldset>

        <fieldset class="address-group">
            <legend>Endereço de cobrança</legend>
            <label>Rua</label><input name="bill_street" />
            <label>Número</label><input type="number" name="bill_number" />
            <label>Bairro</label><input name="bill_neighborhood" />
            <label>Cidade</label><input name="bill_city" />
            <label>Estado</label><input name="bill_state" />
            <label>CEP</label><input name="bill_zip" />
        </fieldset>

        <div class="form-actions">
            <button type="submit" class="btn primary">${data ? 'Salvar' : 'Criar'}</button>
            ${data ? '<button type="button" id="delCustomer" class="btn danger">Remover</button>' : ''}
            <button type="button" id="cancelCustomer" class="btn outline">Cancelar</button>
        </div>
        </form>
    `;

    const form = document.getElementById('customerForm');

    // Preenche dados, se estiver em modo edição
    if (data) {
        form.elements['name'].value = data.name || '';
        form.elements['phone'].value = data.phone || '';
        form.elements['cpf'].value = data.cpf || '';

        const d = data.defaultAddress || {};
        form.elements['def_street'].value = d.street || '';
        form.elements['def_number'].value = d.number || '';
        form.elements['def_neighborhood'].value = d.neighborhood || '';
        form.elements['def_city'].value = d.city || '';
        form.elements['def_state'].value = d.state || '';
        form.elements['def_zip'].value = d.zip || '';

        const a = data.alternateAddress || {};
        form.elements['alt_street'].value = a.street || '';
        form.elements['alt_number'].value = a.number || '';
        form.elements['alt_neighborhood'].value = a.neighborhood || '';
        form.elements['alt_city'].value = a.city || '';
        form.elements['alt_state'].value = a.state || '';
        form.elements['alt_zip'].value = a.zip || '';

        const s = data.shippingAddres || {};
        form.elements['ship_street'].value = s.street || '';
        form.elements['ship_number'].value = s.number || '';
        form.elements['ship_neighborhood'].value = s.neighborhood || '';
        form.elements['ship_city'].value = s.city || '';
        form.elements['ship_state'].value = s.state || '';
        form.elements['ship_zip'].value = s.zip || '';

        const b = data.billingAddress || {};
        form.elements['bill_street'].value = b.street || '';
        form.elements['bill_number'].value = b.number || '';
        form.elements['bill_neighborhood'].value = b.neighborhood || '';
        form.elements['bill_city'].value = b.city || '';
        form.elements['bill_state'].value = b.state || '';
        form.elements['bill_zip'].value = b.zip || '';
    }

    document.getElementById('cancelCustomer').addEventListener('click', () => this.renderCustomerForm());

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const payload = {
          name: form.elements['name'].value.trim(),
          phone: form.elements['phone'].value.trim(),
          cpf: form.elements['cpf'].value.trim(),
          defaultAddress: {
              street: form.elements['def_street'].value.trim(),
              number: Number(form.elements['def_number'].value || 0),
              neighborhood: form.elements['def_neighborhood'].value.trim(),
              city: form.elements['def_city'].value.trim(),
              state: form.elements['def_state'].value.trim(),
              zip: form.elements['def_zip'].value.trim(),
          },
          alternateAddress: {
              street: form.elements['alt_street'].value.trim(),
              number: Number(form.elements['alt_number'].value || 0),
              neighborhood: form.elements['alt_neighborhood'].value.trim(),
              city: form.elements['alt_city'].value.trim(),
              state: form.elements['alt_state'].value.trim(),
              zip: form.elements['alt_zip'].value.trim(),
          },
          shippingAddres: {
              street: form.elements['ship_street'].value.trim(),
              number: Number(form.elements['ship_number'].value || 0),
              neighborhood: form.elements['ship_neighborhood'].value.trim(),
              city: form.elements['ship_city'].value.trim(),
              state: form.elements['ship_state'].value.trim(),
              zip: form.elements['ship_zip'].value.trim(),
          },
          billingAddress: {
              street: form.elements['bill_street'].value.trim(),
              number: Number(form.elements['bill_number'].value || 0),
              neighborhood: form.elements['bill_neighborhood'].value.trim(),
              city: form.elements['bill_city'].value.trim(),
              state: form.elements['bill_state'].value.trim(),
              zip: form.elements['bill_zip'].value.trim(),
          },
        };

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
    });

    if (data) {
        document.getElementById('delCustomer').addEventListener('click', async () => {
        if (!confirm('Remover cliente?')) return;
        const path = `${this.companyPath}/customers`;
        await window.CRUD.delete(path, data.id);
        this.renderCustomerForm();
        });
    }
    // --- Collapsible address-groups in the edit panel (only) ---
    (function initAddressCollapsibles() {
        // pega todos os grupos de endereço no form
        const groups = Array.from(form.querySelectorAll('.address-group'));
        // mantém o primeiro (default) sempre aberto e colapsa os restantes
        groups.forEach((g, i) => {
            const legend = g.querySelector('legend');
            // marca estado inicial: primeiros abertos, demais colapsados
            if (i === 0) {
                g.classList.remove('collapsed');
                if (legend) legend.setAttribute('aria-expanded', 'true');
            } else {
                g.classList.add('collapsed');
                if (legend) legend.setAttribute('aria-expanded', 'false');
            }
            // toggle ao clicar no legend (sempre só neste painel)
            if (legend) {
                legend.style.cursor = 'pointer';
                legend.addEventListener('click', () => {
                    const isCollapsed = g.classList.toggle('collapsed');
                    legend.setAttribute('aria-expanded', String(!isCollapsed));
                });
            }
        });
    })();

    },


  renderCustomerList(arr) {
    const listPane = document.getElementById('listPane');

    if (!arr.length) {
        listPane.innerHTML = '<div class="muted">Nenhum cliente cadastrado.</div>';
        return;
    }

    listPane.innerHTML = arr.map(c => {
        // Endereços formatados
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

        return `
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
            <div><strong>Endereço de envio:</strong> ${escapeHtml(formatAddr(c.shippingAddres))}</div>
            <div><strong>Endereço de cobrança:</strong> ${escapeHtml(formatAddr(c.billingAddress))}</div>
            <div><strong>Criado em:</strong> ${c.createdAt ? new Date(c.createdAt).toLocaleString() : '—'}</div>
            </div>
        </div>
        `;
    }).join('');

    // ======= Eventos =======

    // Toggle de abrir/fechar detalhes
    /* funcional
    listPane.querySelectorAll('.list-item').forEach(item => {
        const header = item.querySelector('.list-header');
        header.addEventListener('click', e => {
        // Ignora clique no botão "Editar"
        if (e.target.closest('button[data-action="edit"]')) return;
        item.classList.toggle('open');
        });
    });
    */
   // Toggle de abrir/fechar detalhes (fecha os outros ao abrir um)
    listPane.querySelectorAll('.list-item').forEach(item => {
      const header = item.querySelector('.list-header');
        header.addEventListener('click', e => {
        // Ignora clique no botão "Editar"
        if (e.target.closest('button[data-action="edit"]')) return;

        const isOpen = item.classList.contains('open');

        // Fecha todos os outros
        listPane.querySelectorAll('.list-item.open').forEach(other => {
          other.classList.remove('open');
        });

        // Reabre apenas este se estava fechado
        if (!isOpen) {
          item.classList.add('open');
        }
      });
    });


    // Botão Editar
    listPane.querySelectorAll('[data-action="edit"]').forEach(btn => {
        btn.addEventListener('click', () => {
        const id = btn.closest('.list-item').dataset.id;
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