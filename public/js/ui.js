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

    // cria painel
    this.content.innerHTML = `
        <div class="panel">
        <div class="panel-left" id="listPane"></div>
        <div class="panel-right" id="formPane"></div>
        </div>
    `;
    this.panelEl = this.content.querySelector('.panel');

    // renderiza formulário
    this.renderCustomerForm();

    // define estado inicial baseado na largura da tela
    if (window.innerWidth <= 1000) this.setPanelState('list-focus');
    else this.setPanelState('default');

    // adapta ao redimensionamento
    this._panelResizeHandler = () => {
      // se for desktop, preferimos 'default' (lado-a-lado).
      if (window.innerWidth > 1000) {
        this.setPanelState('default');
      } else {
        // Ao entrar em modo empilhado, mantenha o foco na lista por padrão,
        // a menos que algum input do form já esteja focado.
        const formPane = document.getElementById('formPane');
        if (formPane && formPane.contains(document.activeElement)) {
          this.setPanelState('form-focus');
        } else {
          this.setPanelState('list-focus');
        }
      }
    };
    window.addEventListener('resize', this._panelResizeHandler);


    // carrega dados da lista
    this.unsubscribe = window.CRUD.subscribe(path, arr => {
        this.renderCustomerList(arr);
    }, 'createdAt');
  },

  // função que gerencia classes de foco / estado do painel
  // função que gerencia classes de foco / estado do painel
  setPanelState(state) {
    if (!this.panelEl) return;

    // remove todas as classes controladas
    this.panelEl.classList.remove(
      'form-focus', 'list-focus', 'form-collapsed', 'list-collapsed'
    );

    const stacked = window.innerWidth <= 1000; // tablet/mobile

    if (state === 'form-focus') {
      if (stacked) {
        // modo empilhado
        this.panelEl.classList.add('form-focus');
      } else {
        // desktop: expande o form, diminui a lista
        this.panelEl.classList.add('form-focus');
      }
    } else if (state === 'list-focus') {
      if (stacked) {
        // modo empilhado
        this.panelEl.classList.add('list-focus');
      } else {
        // desktop: expande a lista, diminui o form
        this.panelEl.classList.add('list-focus');
      }
    }
    // 'default' = sem classes adicionais (painel volta ao estado padrão)
  },

  /*
  setPanelState(state) {
    if (!this.panelEl) return;

    // remove todas as classes controladas
    this.panelEl.classList.remove('form-focus', 'list-focus', 'form-collapsed', 'list-collapsed');

    // Se estivermos em modo empilhado (tablet/mobile) usamos form-focus / list-focus
    const stacked = window.innerWidth <= 1000;

    if (state === 'form-focus') {
      if (stacked) this.panelEl.classList.add('form-focus');
      else this.panelEl.classList.add('form-collapsed'); // desktop: colapsa lista para favorecer o form
    } else if (state === 'list-focus') {
      if (stacked) this.panelEl.classList.add('list-focus');
      else this.panelEl.classList.add('list-collapsed'); // desktop: colapsa form para favorecer a lista
    }
    // 'default' = sem classes adicionais (já removidas)
  },
  */

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
    // Focus — usamos focusin / focusout para detectar qualquer foco dentro do form
    form.addEventListener('focusin', () => {
      // quando um input recebe foco, garante que o form fique em destaque
      this.setPanelState('form-focus');
    });

    // Quando perder todo foco dentro do form, voltamos ao estado de lista
    form.addEventListener('focusout', () => {
      // delay curto para permitir foco em outro elemento do form (p.ex. tabindex)
      setTimeout(() => {
        if (!form.contains(document.activeElement)) {
          // somente volta ao estado de lista se não estivermos no modo de edição forçada
          this.setPanelState('list-focus');
        }
      }, 50);
    });

    // Quando clicar em um item da lista para abrir detalhes → lista cresce, form encolhe
    listPane.querySelectorAll('.list-item').forEach(item => {
      const header = item.querySelector('.list-header');
      header.addEventListener('click', e => {
        if (e.target.closest('button[data-action="edit"]')) return;
        const isOpen = item.classList.contains('open');
        listPane.querySelectorAll('.list-item.open').forEach(other => other.classList.remove('open'));
        if (!isOpen) item.classList.add('open');

        // Ajusta classes do painel
        this.panelEl.classList.add('form-collapsed');
        this.panelEl.classList.remove('list-collapsed');
      });
    });

    // Preenche dados (edição)
    if (data) this.fillCustomerForm(form, data);

    document.getElementById('cancelCustomer').addEventListener('click', () => {
      this.renderCustomerForm();
      this.setPanelState('list-focus'); // volta ao estado de lista em mobile; em desktop será list-collapsed
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
          <div><strong>Criado em:</strong> ${formatDate(c.createdAt)}</div>
          <div><strong>Atualizado em:</strong> ${formatDate(c.updatedAt)}</div>
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

        // comportamento responsivo: em telas empilhadas queremos que o form suba
        if (window.innerWidth <= 1000) {
          this.setPanelState('form-focus');
        } else {
          // no desktop lado-a-lado, colapsamos a lista para dar prioridade ao form
          this.panelEl.classList.add('list-collapsed');
          this.panelEl.classList.remove('form-collapsed');
        }

        // foca o primeiro input do form para disparar o comportamento natural
        setTimeout(() => {
          const formPane = document.getElementById('formPane');
          if (formPane) {
            const firstInput = formPane.querySelector('input, textarea, select');
            if (firstInput) firstInput.focus();
          }
        }, 50);
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
        <label>SKU</label><input name="sku" required />
        <label>EAN</label><input name="ean" />
        <label>Nome</label><input name="name" required />
        <label>Descrição</label><textarea name="description"></textarea>
        <label>Preço (em centavos)</label><input type="number" name="priceCents" />
        <label>Estoque</label><input type="number" name="stock" />
        <label>Unidade</label><input name="unit" />
        <label>Imagens (URLs, separadas por vírgula)</label><textarea name="images"></textarea>
        <label>Categorias (separadas por vírgula)</label><input name="categories" />
        <label>Disponível online</label>
        <select name="availableOnline">
          <option value="true">Sim</option>
          <option value="false">Não</option>
        </select>
        <label>ID do catálogo WhatsApp</label><input name="whatsappCatalogId" />
        <label>Visibilidade</label><input name="visibility" placeholder="public/private" />
        <label>Ativo</label>
        <select name="active">
          <option value="true">Sim</option>
          <option value="false">Não</option>
        </select>
        <fieldset>
          <legend>Meta</legend>
          <label>Peso (g)</label><input type="number" name="meta_weightGrams" />
          <label>Marca</label><input name="meta_brand" />
        </fieldset>
        <div class="form-actions">
          <button type="submit" class="btn primary">${data ? 'Salvar' : 'Criar'}</button>
          ${data ? '<button type="button" id="delProduct" class="btn danger">Remover</button>' : ''}
          <button type="button" id="cancelProduct" class="btn outline">Cancelar</button>
        </div>
      </form>
    `;

    const form = document.getElementById('productForm');

    // Preencher campos em edição
    if (data) {
      form.elements['sku'].value = data.sku || '';
      form.elements['ean'].value = data.ean || '';
      form.elements['name'].value = data.name || '';
      form.elements['description'].value = data.description || '';
      form.elements['priceCents'].value = data.priceCents || 0;
      form.elements['stock'].value = data.stock || 0;
      form.elements['unit'].value = data.unit || '';
      form.elements['images'].value = (data.images || []).join(', ');
      form.elements['categories'].value = (data.categories || []).join(', ');
      form.elements['availableOnline'].value = String(data.availableOnline || false);
      form.elements['whatsappCatalogId'].value = data.whatsappCatalogId || '';
      form.elements['visibility'].value = data.visibility || '';
      form.elements['active'].value = String(data.active || true);
      form.elements['meta_weightGrams'].value = (data.meta && data.meta.weightGrams) || 0;
      form.elements['meta_brand'].value = (data.meta && data.meta.brand) || '';
    }

    // Cancelar
    document.getElementById('cancelProduct').addEventListener('click', () => {
      this.renderProductForm();
      if (window.innerWidth <= 1000) this.setPanelState('list-focus');
      else this.panelEl.classList.remove('form-collapsed');
    });

    // Submit
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        sku: form.elements['sku'].value.trim(),
        ean: form.elements['ean'].value.trim(),
        name: form.elements['name'].value.trim(),
        description: form.elements['description'].value.trim(),
        priceCents: Number(form.elements['priceCents'].value || 0),
        stock: Number(form.elements['stock'].value || 0),
        unit: form.elements['unit'].value.trim(),
        images: form.elements['images'].value.split(',').map(s => s.trim()).filter(Boolean),
        categories: form.elements['categories'].value.split(',').map(s => s.trim()).filter(Boolean),
        availableOnline: form.elements['availableOnline'].value === 'true',
        whatsappCatalogId: form.elements['whatsappCatalogId'].value.trim(),
        visibility: form.elements['visibility'].value.trim(),
        active: form.elements['active'].value === 'true',
        meta: {
          weightGrams: Number(form.elements['meta_weightGrams'].value || 0),
          brand: form.elements['meta_brand'].value.trim()
        }
      };

      const path = `${this.companyPath}/products`;
      try {
        if (data) {
          await window.CRUD.update(path, data.id, payload);
          this.renderProductForm();
        } else {
          await window.CRUD.create(path, payload);
          form.reset();
        }
      } catch (err) {
        console.error('Erro ao salvar produto:', err);
        alert('Erro ao salvar produto. Veja o console.');
      }
    });

    // Deletar
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
      <div class="list-item" data-id="${p.id}">
        <div class="list-header">
          <div>
            <div class="item-title">${escapeHtml(p.name || '—')}</div>
            <div class="item-sub">
              SKU: ${escapeHtml(p.sku || '—')} • R$ ${(Number(p.priceCents||0)/100).toFixed(2)} • estoque: ${p.stock || 0}
            </div>
          </div>
          <div class="item-actions">
            <button class="btn small" data-action="edit">Editar</button>
          </div>
        </div>
        <div class="list-details">
          <div><strong>EAN:</strong> ${escapeHtml(p.ean || '—')}</div>
          <div><strong>Descrição:</strong> ${escapeHtml(p.description || '—')}</div>
          <div><strong>Unidade:</strong> ${escapeHtml(p.unit || '—')}</div>
          <div><strong>Imagens:</strong> ${escapeHtml((p.images || []).join(', '))}</div>
          <div><strong>Categorias:</strong> ${escapeHtml((p.categories || []).join(', '))}</div>
          <div><strong>Disponível online:</strong> ${p.availableOnline ? 'Sim' : 'Não'}</div>
          <div><strong>ID Catálogo WA:</strong> ${escapeHtml(p.whatsappCatalogId || '—')}</div>
          <div><strong>Visibilidade:</strong> ${escapeHtml(p.visibility || '—')}</div>
          <div><strong>Ativo:</strong> ${p.active ? 'Sim' : 'Não'}</div>
          <div><strong>Meta:</strong> Peso ${p.meta?.weightGrams || 0}g • Marca: ${escapeHtml(p.meta?.brand || '—')}</div>
          <div><strong>Criado em:</strong> ${formatDate(p.createdAt)}</div>
          <div><strong>Atualizado em:</strong> ${formatDate(p.updatedAt)}</div>
        </div>
      </div>
    `).join('');

    // Toggle detalhes
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

    // Botão editar
    listPane.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.closest('.list-item').dataset.id;
        const doc = arr.find(x => x.id === id);
        this.renderProductForm(doc);
        if (window.innerWidth <= 1000) this.setPanelState('form-focus');
        else this.panelEl.classList.add('list-collapsed');
        setTimeout(() => {
          const firstInput = document.getElementById('formPane').querySelector('input, textarea, select');
          if (firstInput) firstInput.focus();
        }, 50);
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
  const digits = c.replace(/\D/g, '');
  if (digits.length === 14) {
    return digits.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      '$1.$2.$3/$4-$5'
    );
  }
  return c;
}

// Utils: normaliza valor vindo do Firestore para um objeto Date válido
function toDateFromFirestore(ts) {
  if (!ts) return null;

  // Caso já seja um JS Date
  if (ts instanceof Date) return ts;

  // Firebase v9 modular Timestamp (possui toDate)
  if (typeof ts === 'object' && typeof ts.toDate === 'function') {
    return ts.toDate();
  }

  // Objeto { seconds, nanoseconds } (às vezes retornado)
  if (typeof ts === 'object' && ts.seconds !== undefined) {
    const ms = Number(ts.seconds) * 1000 + Math.floor((ts.nanoseconds || 0) / 1e6);
    return new Date(ms);
  }

  // Número (supondo milissegundos)
  if (typeof ts === 'number') {
    // Se for um timestamp em segundos (ex.: 169xxx), detecta e converte
    if (ts < 1e12) return new Date(ts * 1000); // provavelmente seconds -> multiplica
    return new Date(ts); // ms
  }

  // String ISO
  if (typeof ts === 'string') {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

// Formata Date para string legível; opcionalmente força fuso horário (ex: 'America/Manaus')
function formatDate(ts, timeZone = undefined) {
  const d = toDateFromFirestore(ts);
  if (!d) return '—';
  try {
    // Se timeZone for passado, usamos esse fuso; senão, usa o do usuário
    const opts = { year: 'numeric', month: '2-digit', day: '2-digit',
                   hour: '2-digit', minute: '2-digit', second: '2-digit' };
    if (timeZone) opts.timeZone = timeZone;
    return d.toLocaleString(undefined, opts);
  } catch (err) {
    // fallback simples
    return d.toLocaleString();
  }
}

// expose UI globally
window.UI = UI;