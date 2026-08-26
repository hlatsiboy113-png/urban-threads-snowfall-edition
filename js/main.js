import { initThemeToggle, initMobileNav, initScrollAnimations, initSnowfall, showToast } from './ui.js';
import { initNavbar } from './auth.js';
import { initCart } from './cart.js';
import { initWishlist } from './wishlist.js';
import { fetchProducts, renderProductsGrid, renderProductSkeletons, SEED_PRODUCTS } from './products.js';
import { addToCart } from './cart.js';
import { toggleWishlist, onWishlistChange, getWishlistItems } from './wishlist.js';
import { isAuthenticated } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initMobileNav();
  initNavbar();
  initCart();
  initWishlist();
  initScrollAnimations();

  const page = document.body.dataset.page;
  if (page === 'home') { initHomepage(); initSnowfall(50); }
  else if (page === 'shop') { initShopPage(); }
  else if (page === 'cart') { initCartPage(); }
  else if (page === 'login') { initLoginPage(); }
  else if (page === 'product') { initProductPage(); }
  else if (page === 'account') { initAccountPage(); }
});

/* ── Wishlist heart-icon sync (used by homepage + shop) ── */
function syncWishlistIcons() {
  const items = getWishlistItems();
  document.querySelectorAll('.product-wishlist-btn').forEach(btn => {
    const pid = btn.dataset.productId;
    if (!pid) return;
    const isActive = items.includes(pid);
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-label', isActive ? 'Remove from wishlist' : 'Add to wishlist');
    btn.setAttribute('title', isActive ? 'Remove from wishlist' : 'Add to wishlist');
    const svg = btn.querySelector('svg');
    if (svg) svg.setAttribute('fill', isActive ? 'currentColor' : 'none');
  });
}

/* ── Homepage ── */
async function initHomepage() {
  const featuredContainer = document.getElementById('featured-products-grid');
  if (featuredContainer) {
    renderProductSkeletons(featuredContainer, 4);
    const result = await fetchProducts({ limit: 4 });
    if (result.success) {
      const products = result.products.length > 0 ? result.products : SEED_PRODUCTS.slice(0, 4);
      renderProductsGrid(featuredContainer, products);
      attachProductListeners(featuredContainer);
      syncWishlistIcons();
    } else {
      featuredContainer.innerHTML = `<div class="error-state" style="grid-column:1/-1;"><p>Unable to load featured products.</p></div>`;
    }
  }
}

/* ── Shop ── */
async function initShopPage() {
  const grid = document.getElementById('shop-products-grid');
  const searchInput = document.getElementById('shop-search');
  const categoryPills = document.querySelectorAll('.category-pill');
  const sortSelect = document.getElementById('shop-sort');
  const resultsCount = document.getElementById('results-count');
  if (!grid) return;

  let currentFilters = { search: '', category: 'All', sort: 'featured' };
  let allProducts = [];

  renderProductSkeletons(grid, 8);
  const result = await fetchProducts();
  if (result.success) {
    allProducts = result.products.length > 0 ? result.products : SEED_PRODUCTS;
    applyFilters();
  } else {
    grid.innerHTML = `<div class="error-state" style="grid-column:1/-1;"><svg class="error-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><h3 class="error-state-title">Something went wrong</h3><p class="error-state-text">${result.error}</p><button class="btn btn-dark mt-6" onclick="location.reload()">Try Again</button></div>`;
  }

  if (searchInput) {
    searchInput.addEventListener('input', debounce((e) => { currentFilters.search = e.target.value; applyFilters(); }, 300));
  }
  categoryPills.forEach(pill => {
    pill.addEventListener('click', () => {
      categoryPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentFilters.category = pill.dataset.category;
      applyFilters();
    });
  });
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => { currentFilters.sort = e.target.value; applyFilters(); });
  }

  function applyFilters() {
    const filtered = filterProducts(allProducts, currentFilters);
    renderProductsGrid(grid, filtered);
    attachProductListeners(grid);
    syncWishlistIcons();
    if (resultsCount) resultsCount.textContent = `${filtered.length} product${filtered.length !== 1 ? 's' : ''}`;
  }
}

function filterProducts(products, filters) {
  let result = [...products];
  if (filters.search) {
    const s = filters.search.toLowerCase();
    result = result.filter(p => (p.name && p.name.toLowerCase().includes(s)) || (p.description && p.description.toLowerCase().includes(s)) || (p.category && p.category.toLowerCase().includes(s)));
  }
  if (filters.category && filters.category !== 'All') result = result.filter(p => p.category === filters.category);
  if (filters.sort) {
    switch (filters.sort) {
      case 'price-asc': result.sort((a, b) => (a.price || 0) - (b.price || 0)); break;
      case 'price-desc': result.sort((a, b) => (b.price || 0) - (a.price || 0)); break;
      case 'name-asc': result.sort((a, b) => (a.name || '').localeCompare(b.name || '')); break;
      default: result.sort((a, b) => { if (a.featured && !b.featured) return -1; if (!a.featured && b.featured) return 1; return 0; });
    }
  }
  return result;
}

function debounce(func, wait) {
  let timeout;
  return function(...args) { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), wait); };
}

/* ── Cart page ── */
async function initCartPage() {
  const { requireAuth } = await import('./auth.js');
  if (!requireAuth('login.html')) return;
  const { loadCart, getCartItems, getCartSubtotal, getShippingCost, getCartTotal, updateQuantity, removeFromCart, clearCart, onCartChange } = await import('./cart.js');
  const itemsContainer = document.getElementById('cart-items');
  const summaryContainer = document.getElementById('cart-summary');
  const emptyState = document.getElementById('cart-empty-state');
  const cartContent = document.getElementById('cart-content');
  if (!itemsContainer) return;
  await loadCart();
  renderCart();
  onCartChange(() => renderCart());

  function renderCart() {
    const items = getCartItems();
    if (items.length === 0) {
      if (cartContent) cartContent.classList.add('hidden');
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }
    if (cartContent) cartContent.classList.remove('hidden');
    if (emptyState) emptyState.classList.add('hidden');
    itemsContainer.innerHTML = '';
    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'cart-item';
      el.innerHTML = `
        <img src="${item.imageURL || 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=200&h=250&fit=crop'}" alt="${item.name}" class="cart-item-image" onerror="this.src='https://images.unsplash.com/photo-1556906781-9a412961c28c?w=200&h=250&fit=crop'">
        <div class="cart-item-details">
          <h3 class="cart-item-name">${item.name}</h3>
          <p class="cart-item-category">${item.category || ''}</p>
          ${item.size ? `<p class="cart-item-size">Size: ${item.size}</p>` : ''}
          <p class="cart-item-price">R${(item.price || 0).toLocaleString('en-ZA')}</p>
        </div>
        <div class="cart-item-actions">
          <div class="quantity-selector">
            <button class="quantity-btn cart-qty-decrease" data-id="${item.id}" aria-label="Decrease quantity">−</button>
            <input type="number" class="quantity-input cart-qty-input" value="${item.quantity}" min="1" max="10" data-id="${item.id}" aria-label="Quantity">
            <button class="quantity-btn cart-qty-increase" data-id="${item.id}" aria-label="Increase quantity">+</button>
          </div>
          <p class="cart-item-subtotal">R${((item.price || 0) * (item.quantity || 0)).toLocaleString('en-ZA')}</p>
          <button class="cart-item-remove" data-id="${item.id}">Remove</button>
        </div>
      `;
      itemsContainer.appendChild(el);
    });
    itemsContainer.querySelectorAll('.cart-qty-decrease').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const input = itemsContainer.querySelector(`.cart-qty-input[data-id="${id}"]`);
        const val = parseInt(input.value) || 1;
        if (val > 1) await updateQuantity(id, val - 1);
      });
    });
    itemsContainer.querySelectorAll('.cart-qty-increase').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const input = itemsContainer.querySelector(`.cart-qty-input[data-id="${id}"]`);
        const val = parseInt(input.value) || 1;
        if (val < 10) await updateQuantity(id, val + 1);
      });
    });
    itemsContainer.querySelectorAll('.cart-qty-input').forEach(input => {
      input.addEventListener('change', async () => {
        const id = input.dataset.id;
        let val = parseInt(input.value) || 1;
        val = Math.max(1, Math.min(10, val));
        await updateQuantity(id, val);
      });
    });
    itemsContainer.querySelectorAll('.cart-item-remove').forEach(btn => {
      btn.addEventListener('click', async () => { await removeFromCart(btn.dataset.id); });
    });
    if (summaryContainer) {
      const subtotal = getCartSubtotal();
      const shipping = getShippingCost();
      const total = getCartTotal();
      summaryContainer.innerHTML = `
        <h3 class="cart-summary-title">Order Summary</h3>
        <div class="cart-summary-row"><span>Subtotal</span><span>R${subtotal.toLocaleString('en-ZA')}</span></div>
        <div class="cart-summary-row"><span>Shipping</span><span>${shipping === 0 ? 'FREE' : 'R' + shipping.toLocaleString('en-ZA')}</span></div>
        <div class="cart-summary-total"><span>Total</span><span>R${total.toLocaleString('en-ZA')}</span></div>
        <button class="btn btn-dark btn-full mt-6" id="checkout-btn" ${items.length === 0 ? 'disabled' : ''}>Proceed to Checkout</button>
        <button class="btn btn-outline btn-full mt-4" id="clear-cart-btn">Clear Cart</button>
        <p class="cart-summary-note">Shipping & taxes calculated at checkout</p>
      `;
      document.getElementById('clear-cart-btn')?.addEventListener('click', async () => { if (confirm('Are you sure you want to clear your cart?')) await clearCart(); });
      document.getElementById('checkout-btn')?.addEventListener('click', () => { showToast('Checkout functionality coming soon!', 'success'); });
    }
  }
}

/* ── Login ── */
function initLoginPage() {
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const showSignup = document.getElementById('show-signup');
  const showLogin = document.getElementById('show-login');
  const loginCard = document.getElementById('login-card');
  const signupCard = document.getElementById('signup-card');

  if (showSignup && showLogin && loginCard && signupCard) {
    showSignup.addEventListener('click', (e) => { e.preventDefault(); loginCard.classList.add('hidden'); signupCard.classList.remove('hidden'); });
    showLogin.addEventListener('click', (e) => { e.preventDefault(); signupCard.classList.add('hidden'); loginCard.classList.remove('hidden'); });
  }
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrors();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true; submitBtn.textContent = 'Signing in...';
      const { logIn } = await import('./auth.js');
      const result = await logIn(email, password);
      submitBtn.disabled = false; submitBtn.textContent = 'Sign In';
      if (result.success) {
        const redirect = new URLSearchParams(window.location.search).get('redirect') || 'index.html';
        window.location.href = redirect;
      } else {
        if (result.errors.general) showFormError('login-general', result.errors.general);
        if (result.errors.email) showFormError('login-email', result.errors.email);
        if (result.errors.password) showFormError('login-password', result.errors.password);
      }
    });
  }
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrors();
      const name = document.getElementById('signup-name').value;
      const email = document.getElementById('signup-email').value;
      const password = document.getElementById('signup-password').value;
      const confirmPassword = document.getElementById('signup-confirm').value;
      const submitBtn = signupForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true; submitBtn.textContent = 'Creating account...';
      const { signUp } = await import('./auth.js');
      const result = await signUp(name, email, password, confirmPassword);
      submitBtn.disabled = false; submitBtn.textContent = 'Create Account';
      if (result.success) {
        const redirect = new URLSearchParams(window.location.search).get('redirect') || 'index.html';
        window.location.href = redirect;
      } else {
        if (result.errors.general) showFormError('signup-general', result.errors.general);
        if (result.errors.name) showFormError('signup-name', result.errors.name);
        if (result.errors.email) showFormError('signup-email', result.errors.email);
        if (result.errors.password) showFormError('signup-password', result.errors.password);
        if (result.errors.confirmPassword) showFormError('signup-confirm', result.errors.confirmPassword);
      }
    });
  }
}

function showFormError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  const input = field.tagName === 'INPUT' ? field : field.querySelector('input');
  if (input) input.classList.add('error');
  const errorEl = document.getElementById(fieldId + '-error');
  if (errorEl) { errorEl.textContent = message; errorEl.classList.remove('hidden'); }
}

function clearErrors() {
  document.querySelectorAll('.form-input.error').forEach(el => el.classList.remove('error'));
  document.querySelectorAll('.form-error').forEach(el => { el.textContent = ''; el.classList.add('hidden'); });
}

/* ── Product detail ── */
async function initProductPage() {
  const { initProductDetail } = await import('./product.js');
  await initProductDetail();
}

/* ── Account ── */
async function initAccountPage() {
  const { requireAuth, onAuthStateChange, getUserData, logOut } = await import('./auth.js');
  if (!requireAuth('login.html')) return;
  onAuthStateChange((user, data) => {
    if (!user) return;
    const nameEl = document.getElementById('account-name');
    const emailEl = document.getElementById('account-email');
    const avatarEl = document.getElementById('account-avatar');
    const displayName = data?.name || user.displayName || 'User';
    const email = data?.email || user.email || '';
    if (nameEl) nameEl.textContent = displayName;
    if (emailEl) emailEl.textContent = email;
    if (avatarEl) avatarEl.textContent = displayName.charAt(0).toUpperCase();
  });
  const logoutBtn = document.getElementById('account-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => { e.preventDefault(); await logOut(); window.location.href = 'index.html'; });
  }
}

/* ── Product-card listeners (shop + homepage) ── */
function attachProductListeners(container) {
  if (!container) return;
  container.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault(); e.stopPropagation();
      if (!isAuthenticated()) {
        showToast('Please log in to add items to your cart.', 'warning');
        setTimeout(() => { window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href); }, 1500);
        return;
      }
      const productId = btn.dataset.productId;
      const card = btn.closest('.product-card');
      const name = card?.querySelector('.product-name')?.textContent || 'Product';
      const priceText = card?.querySelector('.product-price')?.textContent || '0';
      const price = parseInt(priceText.replace(/[^0-9]/g, '')) || 0;
      const imageURL = card?.querySelector('img')?.src || '';
      const category = card?.querySelector('.product-category')?.textContent || '';
      btn.disabled = true; btn.textContent = 'Adding...';
      await addToCart({ id: productId, name, price, imageURL, category });
      btn.disabled = false; btn.textContent = 'Add to Cart';
    });
  });
  container.querySelectorAll('.product-wishlist-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault(); e.stopPropagation();
      if (!isAuthenticated()) {
        showToast('Please log in to save items to your wishlist.', 'warning');
        setTimeout(() => { window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href); }, 1500);
        return;
      }
      const productId = btn.dataset.productId;
      const card = btn.closest('.product-card');
      const name = card?.querySelector('.product-name')?.textContent || 'Product';
      const priceText = card?.querySelector('.product-price')?.textContent || '0';
      const price = parseInt(priceText.replace(/[^0-9]/g, '')) || 0;
      const imageURL = card?.querySelector('img')?.src || '';
      const category = card?.querySelector('.product-category')?.textContent || '';
      btn.disabled = true;
      const result = await toggleWishlist({ id: productId, name, price, imageURL, category });
      btn.disabled = false;
      if (result.success) {
        btn.classList.toggle('active');
        const isActive = btn.classList.contains('active');
        btn.setAttribute('aria-label', isActive ? 'Remove from wishlist' : 'Add to wishlist');
        btn.querySelector('svg').setAttribute('fill', isActive ? 'currentColor' : 'none');
      }
    });
  });
}

/* ── Global wishlist sync listener ── */
onWishlistChange(() => syncWishlistIcons());
