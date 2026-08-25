import { db } from './firebase.js';
import { collection, getDocs, query, where, limit, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { showToast, escapeHtml, formatPrice, handleImageError } from './ui.js';

let allProducts = [];
let productsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000;

export async function fetchProducts(options = {}) {
  const { forceRefresh = false, category = null, limit: limitCount = null } = options;
  if (!forceRefresh && productsCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
    let products = [...productsCache];
    if (category) products = products.filter(p => p.category === category);
    if (limitCount) products = products.slice(0, limitCount);
    return { success: true, products };
  }
  try {
    let q = collection(db, 'products');
    if (category) q = query(q, where('category', '==', category));
    if (limitCount) q = query(q, limit(limitCount));
    const snapshot = await getDocs(q);
    const products = [];
    snapshot.forEach(docSnap => products.push({ id: docSnap.id, ...docSnap.data() }));
    if (!category && !limitCount) { productsCache = [...products]; cacheTimestamp = Date.now(); }
    allProducts = productsCache || products;
    return { success: true, products };
  } catch (err) {
    console.error('Error fetching products:', err);
    return { success: false, error: 'Failed to load products. Please try again later.', products: [] };
  }
}

export async function fetchProduct(productId) {
  if (!productId) return { success: false, error: 'Invalid product ID.' };
  try {
    const docSnap = await getDoc(doc(db, 'products', productId));
    if (!docSnap.exists()) return { success: false, error: 'Product not found.' };
    return { success: true, product: { id: docSnap.id, ...docSnap.data() } };
  } catch (err) {
    console.error('Error fetching product:', err);
    return { success: false, error: 'Failed to load product. Please try again later.' };
  }
}

export function filterProducts(products, filters) {
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
      default: result.sort((a, b) => { if (a.featured && !b.featured) return -1; if (!a.featured && b.featured) return 1; return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0); });
    }
  }
  return result;
}

export function createProductCard(product, options = {}) {
  const { showWishlist = true, wishlistItems = [] } = options;
  const isWishlisted = wishlistItems.includes(product.id);
  const card = document.createElement('article');
  card.className = 'product-card fade-in';
  card.setAttribute('data-product-id', product.id);
  const badgeHtml = product.badge ? `<span class="product-badge">${escapeHtml(product.badge)}</span>` : '';
  const wishlistHtml = showWishlist ? `<button class="product-wishlist-btn ${isWishlisted ? 'active' : ''}" data-product-id="${product.id}" aria-label="${isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}" title="${isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}"><svg viewBox="0 0 24 24" ${isWishlisted ? 'fill="currentColor"' : ''}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></button>` : '';
  card.innerHTML = `
    <a href="product.html?id=${product.id}" class="product-image-wrapper">
      ${badgeHtml}${wishlistHtml}
      <img src="${escapeHtml(product.imageURL || '')}" alt="${escapeHtml(product.name || 'Product image')}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1556906781-9a412961c28c?w=600&h=800&fit=crop'">
    </a>
    <div class="product-info">
      <p class="product-category">${escapeHtml(product.category || '')}</p>
      <h3 class="product-name">${escapeHtml(product.name || 'Untitled Product')}</h3>
      <p class="product-price">${formatPrice(product.price)}</p>
      <div class="product-actions">
        <button class="btn btn-dark btn-sm btn-full add-to-cart-btn" data-product-id="${product.id}">Add to Cart</button>
      </div>
    </div>
  `;
  const img = card.querySelector('img');
  if (img) handleImageError(img);
  return card;
}

export function renderProductsGrid(container, products, options = {}) {
  if (!container) return;
  container.innerHTML = '';
  if (products.length === 0) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="15" x2="16" y2="15"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg><h3 class="empty-state-title">No products found</h3><p class="empty-state-text">Try adjusting your search or filter to find what you're looking for.</p></div>`;
    return;
  }
  products.forEach((product, index) => {
    const card = createProductCard(product, options);
    card.style.animationDelay = `${index * 0.05}s`;
    container.appendChild(card);
  });
}

export function renderProductSkeletons(container, count = 8) {
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const s = document.createElement('div');
    s.className = 'product-card';
    s.innerHTML = `<div class="product-image-wrapper"><div class="skeleton" style="width:100%;height:100%;"></div></div><div class="product-info"><div class="skeleton" style="width:40%;height:12px;margin-bottom:8px;"></div><div class="skeleton" style="width:80%;height:16px;margin-bottom:8px;"></div><div class="skeleton" style="width:30%;height:16px;margin-bottom:12px;"></div><div class="skeleton" style="width:100%;height:36px;"></div></div>`;
    container.appendChild(s);
  }
}

export const CATEGORIES = ['All', 'Puffers', 'Snow Gear', 'Layering', 'Accessories'];

export const SEED_PRODUCTS = [
  { name: "Kids Alpine Puffer", price: 1299, category: "Puffers", description: "Insulated winter puffer designed for active cold-weather days. Water-resistant shell with synthetic down fill and reflective safety details.", imageURL: "https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=600&h=800&fit=crop", featured: true, badge: "BEST SELLER", sizes: ["6-7Y","8-9Y","10-11Y","12-13Y"], ageRange: "6-13", fit: "Regular", warmthLevel: "High", weatherResistance: "Water Resistant", materials: "100% Nylon shell, synthetic down fill", careInstructions: "Machine wash cold, tumble dry low" },
  { name: "Arctic Parka", price: 1699, category: "Puffers", description: "Heavy-duty parka with faux-fur trimmed hood and extended length for maximum warmth. Built for the coldest mountain days.", imageURL: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&h=800&fit=crop", featured: false, badge: null, sizes: ["6-7Y","8-9Y","10-11Y","12-13Y"], ageRange: "6-13", fit: "Regular", warmthLevel: "Extreme", weatherResistance: "Waterproof", materials: "Polyester shell, thermal lining", careInstructions: "Machine wash gentle, line dry" },
  { name: "Trail Puffer Vest", price: 799, category: "Puffers", description: "Lightweight quilted vest perfect for layering. Core warmth without restricting movement on the slopes or trails.", imageURL: "https://images.unsplash.com/photo-1517260739337-6799d239ce83?w=600&h=800&fit=crop", featured: true, badge: "NEW", sizes: ["6-7Y","8-9Y","10-11Y","12-13Y"], ageRange: "6-13", fit: "Regular", warmthLevel: "Medium", weatherResistance: "Water Resistant", materials: "Ripstop nylon, lightweight fill", careInstructions: "Machine wash cold" },
  { name: "Snow Pro Jacket", price: 1899, category: "Snow Gear", description: "Technical snow jacket with sealed seams, powder skirt, and ventilation zips. Designed for young skiers and snowboarders who demand performance.", imageURL: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&h=800&fit=crop", featured: true, badge: "BEST SELLER", sizes: ["6-7Y","8-9Y","10-11Y","12-13Y"], ageRange: "6-13", fit: "Relaxed", warmthLevel: "High", weatherResistance: "Waterproof", materials: "3-layer waterproof membrane", careInstructions: "Machine wash cold, re-waterproof annually" },
  { name: "Freestyle Snow Pants", price: 999, category: "Snow Gear", description: "Reinforced snow pants with articulated knees and boot gaiters. Built for jumps, tricks, and deep powder landings.", imageURL: "https://images.unsplash.com/photo-1605540436563-5bca919ae766?w=600&h=800&fit=crop", featured: false, badge: null, sizes: ["6-7Y","8-9Y","10-11Y","12-13Y"], ageRange: "6-13", fit: "Relaxed", warmthLevel: "High", weatherResistance: "Waterproof", materials: "Oxford nylon, fleece lining", careInstructions: "Machine wash cold" },
  { name: "Thermal Base Layer Set", price: 549, category: "Layering", description: "Moisture-wicking thermal top and bottom set. Soft merino-blend fabric regulates temperature during high-output winter sports.", imageURL: "https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=600&h=800&fit=crop", featured: false, badge: null, sizes: ["6-7Y","8-9Y","10-11Y","12-13Y"], ageRange: "6-13", fit: "Slim", warmthLevel: "Medium", weatherResistance: "Moisture Wicking", materials: "Merino wool blend", careInstructions: "Machine wash wool cycle, lay flat to dry" },
  { name: "Fleece Mid-Layer", price: 649, category: "Layering", description: "Breathable fleece pullover with zip neck and hand-warmer pockets. The essential middle layer for any winter adventure.", imageURL: "https://images.unsplash.com/photo-1517263904808-5dc91e3e704e?w=600&h=800&fit=crop", featured: true, badge: "NEW", sizes: ["6-7Y","8-9Y","10-11Y","12-13Y"], ageRange: "6-13", fit: "Regular", warmthLevel: "Medium", weatherResistance: "Breathable", materials: "Recycled polyester fleece", careInstructions: "Machine wash cold" },
  { name: "Snow Hoodie", price: 749, category: "Layering", description: "Heavyweight cotton-blend hoodie with brushed interior. Oversized fit for comfort and layering under jackets.", imageURL: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&h=800&fit=crop", featured: false, badge: null, sizes: ["6-7Y","8-9Y","10-11Y","12-13Y"], ageRange: "6-13", fit: "Oversized", warmthLevel: "Medium", weatherResistance: "Casual", materials: "80% Cotton, 20% Polyester", careInstructions: "Machine wash warm" },
  { name: "Winter Beanie", price: 249, category: "Accessories", description: "Ribbed knit beanie with fleece lining. Fold-over cuff with embroidered mountain logo. One size fits most kids.", imageURL: "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=600&h=800&fit=crop", featured: false, badge: null, sizes: ["One Size"], ageRange: "6-13", fit: "Regular", warmthLevel: "Medium", weatherResistance: "Casual", materials: "Acrylic knit, fleece lining", careInstructions: "Hand wash" },
  { name: "Ski Goggles", price: 599, category: "Accessories", description: "Anti-fog ski goggles with UV400 protection and dual-layer lens. Adjustable strap fits over helmets. Youth-specific frame size.", imageURL: "https://images.unsplash.com/photo-1565992441121-4367c2967103?w=600&h=800&fit=crop", featured: true, badge: "NEW", sizes: ["Youth"], ageRange: "6-13", fit: "Regular", warmthLevel: "N/A", weatherResistance: "UV Protection", materials: "TPU frame, polycarbonate lens", careInstructions: "Wipe clean with microfiber cloth" },
  { name: "Snow Gloves", price: 349, category: "Accessories", description: "Waterproof insulated gloves with reinforced palms and wrist cinch. Touchscreen-compatible thumb for device use on the lift.", imageURL: "https://images.unsplash.com/photo-1605218427306-022ba6c5547c?w=600&h=800&fit=crop", featured: false, badge: null, sizes: ["S","M","L"], ageRange: "6-13", fit: "Regular", warmthLevel: "High", weatherResistance: "Waterproof", materials: "Nylon shell, Thinsulate fill", careInstructions: "Hand wash, air dry" },
  { name: "Mountain Backpack 15L", price: 699, category: "Accessories", description: "Compact hydration-compatible backpack with ski carry straps and avalanche probe pocket. Built for backcountry young explorers.", imageURL: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&h=800&fit=crop", featured: false, badge: null, sizes: ["One Size"], ageRange: "6-13", fit: "Regular", warmthLevel: "N/A", weatherResistance: "Water Resistant", materials: "Ripstop nylon", careInstructions: "Wipe clean" },
  { name: "Snow Boots", price: 1199, category: "Snow Gear", description: "Insulated winter boots with waterproof membrane and aggressive rubber outsole. Rated to -25C for extreme cold adventures.", imageURL: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&h=800&fit=crop", featured: true, badge: "BEST SELLER", sizes: ["EU 32","EU 34","EU 36","EU 38"], ageRange: "6-13", fit: "Regular", warmthLevel: "Extreme", weatherResistance: "Waterproof", materials: "Synthetic leather, rubber outsole", careInstructions: "Wipe clean, air dry" },
  { name: "Neck Warmer", price: 199, category: "Accessories", description: "Seamless fleece neck gaiter that pulls up to cover nose and ears. Essential protection against wind chill on the mountain.", imageURL: "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=600&h=800&fit=crop", featured: false, badge: null, sizes: ["One Size"], ageRange: "6-13", fit: "Regular", warmthLevel: "Medium", weatherResistance: "Wind Resistant", materials: "Polar fleece", careInstructions: "Machine wash cold" },
  { name: "Helmet — Matte Black", price: 899, category: "Snow Gear", description: "Lightweight in-mold ski helmet with adjustable fit dial and removable ear pads. Certified for skiing and snowboarding.", imageURL: "https://images.unsplash.com/photo-1517260739337-6799d239ce83?w=600&h=800&fit=crop", featured: false, badge: null, sizes: ["S","M","L"], ageRange: "6-13", fit: "Adjustable", warmthLevel: "N/A", weatherResistance: "Impact Certified", materials: "EPS foam, polycarbonate shell", careInstructions: "Wipe clean interior" },
  { name: "Thermal Socks 2-Pack", price: 249, category: "Accessories", description: "Merino wool blend ski socks with padded shin and arch support. Mid-calf height designed to work with ski and snowboard boots.", imageURL: "https://images.unsplash.com/photo-1582966772680-860e372bb558?w=600&h=800&fit=crop", featured: false, badge: null, sizes: ["S","M","L"], ageRange: "6-13", fit: "Regular", warmthLevel: "High", weatherResistance: "Moisture Wicking", materials: "Merino wool, nylon, spandex", careInstructions: "Machine wash wool cycle" }
];
