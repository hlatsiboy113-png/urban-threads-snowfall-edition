# Urban Threads — Snowfall Edition

**Winter '26 — Kids Collection**

Premium winter and snow gear e-commerce experience for young athletes and kids. Built for the cold.

**Live site:** https://hlatsiboy113-png.github.io/urban-threads-snowfall-edition/

---

## Campaign

**WINTER '26 — KIDS COLLECTION**

- Hero: *Built for the Cold*
- Subtitle: Performance. Protection. Play.
- Focus: young athletes who ski, snowboard, and explore

### Approved product types only
Puffers · Snow jackets · Winter jackets · Snow pants · Thermal / base layers · Fleece · Winter hoodies · Winter trousers · Gloves · Beanies · Scarves · Winter accessories · Cold-weather footwear · Mountain apparel

### Primary categories
1. **Puffers**
2. **Snow Gear**
3. **Layering**
4. **Accessories**

No swimwear, beachwear, summer clothing, random T-shirts, or unrelated casual/formal fashion.

---

## Features

- Dynamic product catalogue (Firestore + local seed fallback)
- Search, category filter (Puffers / Snow Gear / Layering / Accessories), and sorting
- Product detail pages with size selector
- User authentication (email/password via Firebase Auth)
- Persistent cart (size-aware) and wishlist per authenticated user
- Auth-aware navigation, cart count, theme toggle (light/dark)
- Homepage snowfall animation (~50 flakes)
- Responsive layout, semantic HTML, keyboard-friendly controls, toasts
- Firestore security rules enforcing owner-only cart/wishlist access

---

## Tech stack

- HTML5, CSS3 (variables, Grid, Flexbox)
- JavaScript ES modules
- Firebase Authentication & Firestore (v10.7.0 via CDN)
- Google Fonts (Inter)
- Deployed via GitHub Pages

---

## Project structure

```
urban-threads-snowfall-edition/
├── index.html          # Home — Winter '26 campaign
├── shop.html           # Product discovery
├── product.html        # Product detail + size
├── cart.html
├── login.html
├── account.html
├── css/
│   ├── styles.css
│   ├── components.css
│   └── responsive.css
├── js/
│   ├── firebase.js     # Firebase init (replace placeholders)
│   ├── auth.js
│   ├── products.js     # Fetch, filter, seed data
│   ├── product.js
│   ├── cart.js
│   ├── wishlist.js
│   ├── ui.js
│   └── main.js
├── firestore.rules
├── SEED_DATA.json
└── README.md
```

---

## Firebase setup (required for full functionality)

The shipped `js/firebase.js` contains **placeholders only**:

```js
apiKey: "YOUR_API_KEY"
projectId: "YOUR_PROJECT_ID"
// ...
```

**Do not invent credentials.** To connect a real backend:

1. Create a project in [Firebase Console](https://console.firebase.google.com/).
2. Register a Web app and copy the config object into `js/firebase.js`.
3. Enable **Email/Password** under Authentication → Sign-in method.
4. Create a Firestore database.
5. Deploy the rules in `firestore.rules` (products public-read / no public write; users, cart, and wishlist owner-only).
6. Seed the `products` collection from `SEED_DATA.json` (or the matching `SEED_PRODUCTS` array in `js/products.js`).

Until real config is supplied, the app falls back to the in-code winter seed catalogue for browsing. Auth, persistent cart, and wishlist require a live Firebase project.

### Firestore structure

```
products/{productId}              # public read
users/{userId}                    # owner only
users/{userId}/cart/{itemId}      # owner only
users/{userId}/wishlist/{itemId}  # owner only
```

### Security rules summary

- Products: read = true, write = false
- User profile, cart, wishlist: authenticated owner only

---

## Local development

Serve over HTTP (ES modules + Firebase CDN):

```bash
python -m http.server 8000
# or: npx serve .
```

Open `http://localhost:8000`.

---

## Deployment

This repository is set up for **GitHub Pages** (live URL above).

After pushing to `main`:

1. Confirm GitHub Pages is enabled for the repository (Settings → Pages → Deploy from branch `main` / root).
2. Wait for the Pages build.
3. Verify the live URL and browser console.

Alternatively use Firebase Hosting, Netlify, or Vercel.

---

## Cart & wishlist behaviour

- Cart and wishlist require login.
- Selected product **size** is stored on cart items.
- Shipping: R99, free over R1,500 (ZAR).
- Data lives in the signed-in user’s Firestore subcollections.

---

## Known limitations

- Checkout is a placeholder (no payment gateway).
- Order history not implemented.
- Product images use external Unsplash URLs.
- Full auth/cart/wishlist only work after real Firebase credentials are added and rules deployed.
- No offline/localStorage cart fallback when logged out.

---

## Seed products

All 16 seed products are winter/snow oriented (Puffers, Snow Gear, Layering, Accessories). See `SEED_DATA.json` and `js/products.js` (`SEED_PRODUCTS`).

---

## Licence / notes

Fictional store for demonstration and assessment purposes.
