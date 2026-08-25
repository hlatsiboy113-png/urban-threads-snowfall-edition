import { fetchProduct } from './products.js';
import { addToCart } from './cart.js';
import { toggleWishlist, isWishlisted, onWishlistChange } from './wishlist.js';
import { isAuthenticated } from './auth.js';
import { showToast, formatPrice, escapeHtml, handleImageError } from './ui.js';

const RECENTLY_VIEWED_KEY = 'urban-threads-kids-recently-viewed';
const MAX_RECENT = 6;

export function addToRecentlyViewed(product) {
  if (!product || !product.id) return;
  let recent = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]');
  recent = recent.filter(p => p.id !== product.id);
  recent.unshift({ id: product.id, name: product.name, imageURL: product.imageURL, price: product.price });
  if (recent.length > MAX_RECENT) recent = recent.slice(0, MAX_RECENT);
  localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(recent));
}

export function getRecentlyViewed() {
  return JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]');
}

export function renderRecentlyViewed(container) {
  if (!container) return;
  const recent = getRecentlyViewed();
  if (recent.length === 0) { container.innerHTML = ''; container.style.display = 'none'; return; }
  container.style.display = 'block';
  container.innerHTML = `<div class="container"><h3 class="recently-viewed-title">Recently Viewed</h3><div class="recently-viewed-grid" id="recently-viewed-grid"></div></div>`;
  const grid = container.querySelector('#recently-viewed-grid');
  recent.forEach(item => {
    const el = document.createElement('a');
    el.href = `product.html?id=${item.id}`;
    el.className = 'recently-viewed-item';
    el.innerHTML = `<img src="${escapeHtml(item.imageURL || '')}" alt="${escapeHtml(item.name || '')}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1556906781-9a412961c28c?w=400&h=500&fit=crop'"><div class="recently-viewed-item-overlay"><span class="recently-viewed-item-name">${escapeHtml(item.name || '')}</span></div>`;
    grid.appendChild(el);
  });
}

export async function initProductDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');
  if (!productId) { renderProductError('No product specified.'); return; }
  const container = document.getElementById('product-detail-container');
  if (!container) return;
  container.innerHTML = `<div class="loading-container" style="grid-column:1/-1;"><div class="loading-spinner"></div><p class="loading-text">Loading product...</p></div>`;
  const result = await fetchProduct(productId);
  if (!result.success || !result.product) { renderProductError(result.error || 'Product not found.'); return; }
  const product = result.product;
  addToRecentlyViewed(product);
  renderProduct(product, container);
  renderRecentlyViewed(document.getElementById('recently-viewed-section'));
}

function renderProduct(product, container) {
  const sizes = product.sizes || ['6-7Y', '8-9Y', '10-11Y', '12-13Y'];
  const specs = [
    { label: 'Category', value: product.category || 'N/A' },
    { label: 'Age Range', value: product.ageRange || '6-13' },
    { label: 'Fit', value: product.fit || 'Regular' },
    { label: 'Warmth', value: product.warmthLevel || 'Medium' },
    { label: 'Weather', value: product.weatherResistance || 'N/A' },
    { label: 'Materials', value: product.materials || 'N/A' },
  ];

  let sizeButtons = sizes.map((size, idx) => 
    `<button class="size-option ${idx === 0 ? 'active' : ''}" data-size="${escapeHtml(size)}">${escapeHtml(size)}</button>`
  ).join('');

  let specsHtml = specs.map(spec => 
    `<div class="spec-item"><p class="spec-label">${escapeHtml(spec.label)}</p><p class="spec-value">${escapeHtml(spec.value)}</p></div>`
  ).join('');

  container.innerHTML = `
    <div class="product-detail-image">
      <img src="${escapeHtml(product.imageURL || '')}" alt="${escapeHtml(product.name || '')}" id="product-main-image" onerror="this.src='https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800&h=1000&fit=crop'">
    </div>
    <div class="product-detail-info">
      <p class="product-detail-category">${escapeHtml(product.category || '')}</p>
      <h1 class="product-detail-name">${escapeHtml(product.name || '')}</h1>
      <p class="product-detail-price">${formatPrice(product.price)}</p>
      <p class="product-detail-description">${escapeHtml(product.description || '')}</p>

      <div class="size-selector">
        <span class="size-selector-label">Select Size</span>
        <div class="size-options" id="size-options">
          ${sizeButtons}
        </div>
      </div>

      <div class="specs-grid">
        ${specsHtml}
      </div>

      <div class="product-detail-actions">
        <div class="quantity-selector">
          <button class="quantity-btn" id="qty-decrease" aria-label="Decrease quantity">−</button>
          <input type="number" class="quantity-input" id="qty-input" value="1" min="1" max="10" aria-label="Quantity">
          <button class="quantity-btn" id="qty-increase" aria-label="Increase quantity">+</button>
        </div>
        <button class="btn btn-dark btn-lg" id="add-to-cart-btn" style="flex:1;">Add to Cart</button>
        <button class="btn btn-outline" id="wishlist-btn" aria-label="Add to wishlist">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
      </div>

      <div class="product-meta">
        <div class="product-meta-item"><span class="product-meta-label">SKU</span><span class="product-meta-value">UTK-${product.id?.substring(0,6).toUpperCase() || '000000'}</span></div>
        <div class="product-meta-item"><span class="product-meta-label">Shipping</span><span class="product-meta-value">R99 (Free over R1,500)</span></div>
        ${product.careInstructions ? `<div class="product-meta-item"><span class="product-meta-label">Care</span><span class="product-meta-value">${escapeHtml(product.careInstructions)}</span></div>` : ''}
      </div>
    </div>
  `;

  // Size selection
  let selectedSize = sizes[0];
  const sizeOptions = container.querySelectorAll('.size-option');
  sizeOptions.forEach(btn => {
    btn.addEventListener('click', () => {
      sizeOptions.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedSize = btn.dataset.size;
    });
  });

  // Quantity
  const qtyInput = document.getElementById('qty-input');
  document.getElementById('qty-decrease').addEventListener('click', () => {
    const val = parseInt(qtyInput.value) || 1;
    if (val > 1) qtyInput.value = val - 1;
  });
  document.getElementById('qty-increase').addEventListener('click', () => {
    const val = parseInt(qtyInput.value) || 1;
    if (val < 10) qtyInput.value = val + 1;
  });
  qtyInput.addEventListener('change', () => {
    let val = parseInt(qtyInput.value) || 1;
    qtyInput.value = Math.max(1, Math.min(10, val));
  });

  // Add to cart
  const addBtn = document.getElementById('add-to-cart-btn');
  addBtn.addEventListener('click', async () => {
    if (!isAuthenticated()) {
      showToast('Please log in to add items to your cart.', 'warning');
      setTimeout(() => window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href), 1500);
      return;
    }
    const qty = parseInt(qtyInput.value) || 1;
    addBtn.disabled = true;
    addBtn.textContent = 'Adding...';
    await addToCart(product, qty, selectedSize);
    addBtn.disabled = false;
    addBtn.textContent = 'Add to Cart';
  });

  // Wishlist
  const wishlistBtn = document.getElementById('wishlist-btn');
  wishlistBtn.addEventListener('click', async () => {
    if (!isAuthenticated()) {
      showToast('Please log in to save items to your wishlist.', 'warning');
      setTimeout(() => window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href), 1500);
      return;
    }
    wishlistBtn.disabled = true;
    const result = await toggleWishlist(product);
    wishlistBtn.disabled = false;
    if (result.success) {
      const active = isWishlisted(product.id);
      wishlistBtn.querySelector('svg').setAttribute('fill', active ? 'currentColor' : 'none');
    }
  });

  onWishlistChange(() => {
    const btn = document.getElementById('wishlist-btn');
    if (!btn) return;
    const svg = btn.querySelector('svg');
    if (svg) svg.setAttribute('fill', isWishlisted(product.id) ? 'currentColor' : 'none');
  });
}

function renderProductError(message) {
  const container = document.getElementById('product-detail-container');
  if (!container) return;
  container.innerHTML = `<div class="error-state" style="grid-column:1/-1;padding:var(--space-24) 0;"><svg class="error-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><h3 class="error-state-title">Product Not Found</h3><p class="error-state-text">${escapeHtml(message)}</p><a href="shop.html" class="btn btn-dark mt-6">Browse Products</a></div>`;
}
