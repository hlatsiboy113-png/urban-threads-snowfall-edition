/**
 * Urban Threads — Product Detail Module
 * Handles product detail page functionality
 */

import { fetchProduct } from './products.js';
import { addToCart } from './cart.js';
import { toggleWishlist, isWishlisted, onWishlistChange } from './wishlist.js';
import { isAuthenticated } from './auth.js';
import { showToast, formatPrice, escapeHtml, handleImageError } from './ui.js';

// ============================================
// RECENTLY VIEWED
// ============================================
const RECENTLY_VIEWED_KEY = 'urban-threads-recently-viewed';
const MAX_RECENT = 6;

export function addToRecentlyViewed(product) {
  if (!product || !product.id) return;

  let recent = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]');

  // Remove if already exists
  recent = recent.filter(p => p.id !== product.id);

  // Add to front
  recent.unshift({
    id: product.id,
    name: product.name,
    imageURL: product.imageURL,
    price: product.price
  });

  // Limit
  if (recent.length > MAX_RECENT) {
    recent = recent.slice(0, MAX_RECENT);
  }

  localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(recent));
}

export function getRecentlyViewed() {
  return JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]');
}

export function renderRecentlyViewed(container) {
  if (!container) return;

  const recent = getRecentlyViewed();

  if (recent.length === 0) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  container.innerHTML = `
    <div class="container">
      <h3 class="recently-viewed-title">Recently Viewed</h3>
      <div class="recently-viewed-grid" id="recently-viewed-grid"></div>
    </div>
  `;

  const grid = container.querySelector('#recently-viewed-grid');

  recent.forEach(item => {
    const el = document.createElement('a');
    el.href = `product.html?id=${item.id}`;
    el.className = 'recently-viewed-item';
    el.innerHTML = `
      <img src="${escapeHtml(item.imageURL || '')}" alt="${escapeHtml(item.name || '')}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1556906781-9a412961c28c?w=400&h=500&fit=crop'">
      <div class="recently-viewed-item-overlay">
        <span class="recently-viewed-item-name">${escapeHtml(item.name || '')}</span>
      </div>
    `;
    grid.appendChild(el);
  });
}

// ============================================
// PRODUCT DETAIL PAGE
// ============================================
export async function initProductDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  if (!productId) {
    renderProductError('No product specified.');
    return;
  }

  const container = document.getElementById('product-detail-container');
  if (!container) return;

  // Show loading
  container.innerHTML = `
    <div class="loading-container" style="grid-column: 1 / -1;">
      <div class="loading-spinner"></div>
      <p class="loading-text">Loading product...</p>
    </div>
  `;

  const result = await fetchProduct(productId);

  if (!result.success || !result.product) {
    renderProductError(result.error || 'Product not found.');
    return;
  }

  const product = result.product;

  // Add to recently viewed
  addToRecentlyViewed(product);

  // Render product
  renderProduct(product, container);

  // Render recently viewed
  const recentlyViewedContainer = document.getElementById('recently-viewed-section');
  renderRecentlyViewed(recentlyViewedContainer);
}

function renderProduct(product, container) {
  const isWishlisted = isWishlistedState(product.id);

  container.innerHTML = `
    <div class="product-detail-image">
      <img src="${escapeHtml(product.imageURL || '')}" alt="${escapeHtml(product.name || '')}" id="product-main-image" onerror="this.src='https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800&h=1000&fit=crop'">
    </div>
    <div class="product-detail-info">
      <p class="product-detail-category">${escapeHtml(product.category || '')}</p>
      <h1 class="product-detail-name">${escapeHtml(product.name || '')}</h1>
      <p class="product-detail-price">${formatPrice(product.price)}</p>
      <p class="product-detail-description">${escapeHtml(product.description || '')}</p>

      <div class="product-detail-actions">
        <div class="quantity-selector">
          <button class="quantity-btn" id="qty-decrease" aria-label="Decrease quantity">−</button>
          <input type="number" class="quantity-input" id="qty-input" value="1" min="1" max="10" aria-label="Quantity">
          <button class="quantity-btn" id="qty-increase" aria-label="Increase quantity">+</button>
        </div>
        <button class="btn btn-dark btn-lg" id="add-to-cart-btn" style="flex:1;">
          Add to Cart
        </button>
        <button class="btn btn-outline" id="wishlist-btn" aria-label="${isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="${isWishlisted ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>

      <div class="product-meta">
        <div class="product-meta-item">
          <span class="product-meta-label">Category</span>
          <span class="product-meta-value">${escapeHtml(product.category || 'N/A')}</span>
        </div>
        <div class="product-meta-item">
          <span class="product-meta-label">SKU</span>
          <span class="product-meta-value">UT-${product.id?.substring(0, 6).toUpperCase() || '000000'}</span>
        </div>
        <div class="product-meta-item">
          <span class="product-meta-label">Shipping</span>
          <span class="product-meta-value">R99 (Free over R1,500)</span>
        </div>
      </div>
    </div>
  `;

  // Quantity controls
  const qtyInput = document.getElementById('qty-input');
  const qtyDecrease = document.getElementById('qty-decrease');
  const qtyIncrease = document.getElementById('qty-increase');

  qtyDecrease.addEventListener('click', () => {
    const val = parseInt(qtyInput.value) || 1;
    if (val > 1) qtyInput.value = val - 1;
  });

  qtyIncrease.addEventListener('click', () => {
    const val = parseInt(qtyInput.value) || 1;
    if (val < 10) qtyInput.value = val + 1;
  });

  qtyInput.addEventListener('change', () => {
    let val = parseInt(qtyInput.value) || 1;
    val = Math.max(1, Math.min(10, val));
    qtyInput.value = val;
  });

  // Add to cart
  const addToCartBtn = document.getElementById('add-to-cart-btn');
  addToCartBtn.addEventListener('click', async () => {
    if (!isAuthenticated()) {
      showToast('Please log in to add items to your cart.', 'warning');
      setTimeout(() => {
        window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
      }, 1500);
      return;
    }

    const quantity = parseInt(qtyInput.value) || 1;
    addToCartBtn.disabled = true;
    addToCartBtn.textContent = 'Adding...';

    const result = await addToCart(product, quantity);

    addToCartBtn.disabled = false;
    addToCartBtn.textContent = 'Add to Cart';
  });

  // Wishlist
  const wishlistBtn = document.getElementById('wishlist-btn');
  wishlistBtn.addEventListener('click', async () => {
    if (!isAuthenticated()) {
      showToast('Please log in to save items to your wishlist.', 'warning');
      setTimeout(() => {
        window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
      }, 1500);
      return;
    }

    wishlistBtn.disabled = true;
    const result = await toggleWishlist(product);
    wishlistBtn.disabled = false;

    if (result.success) {
      const newState = isWishlistedState(product.id);
      wishlistBtn.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="${newState ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      `;
      wishlistBtn.setAttribute('aria-label', newState ? 'Remove from wishlist' : 'Add to wishlist');
    }
  });

  // Listen for wishlist changes
  onWishlistChange(() => {
    const btn = document.getElementById('wishlist-btn');
    if (!btn) return;
    const state = isWishlistedState(product.id);
    btn.innerHTML = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="${state ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    `;
  });
}

function isWishlistedState(productId) {
  // Access wishlist state from module
  // This is a simplified check - in practice the onWishlistChange handles UI updates
  const btn = document.getElementById('wishlist-btn');
  if (!btn) return false;
  const svg = btn.querySelector('svg');
  return svg && svg.getAttribute('fill') === 'currentColor';
}

function renderProductError(message) {
  const container = document.getElementById('product-detail-container');
  if (!container) return;

  container.innerHTML = `
    <div class="error-state" style="grid-column: 1 / -1; padding: var(--space-24) 0;">
      <svg class="error-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <h3 class="error-state-title">Product Not Found</h3>
      <p class="error-state-text">${escapeHtml(message)}</p>
      <a href="shop.html" class="btn btn-dark mt-6">Browse Products</a>
    </div>
  `;
}
