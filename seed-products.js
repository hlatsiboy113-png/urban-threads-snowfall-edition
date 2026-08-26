import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

// ------------------------------------------------------------------
// Load service account credentials securely from environment
// ------------------------------------------------------------------
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  // Raw JSON string in env var (useful for CI/CD)
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  // Path to JSON file (standard local workflow)
  serviceAccount = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
} else {
  console.error('\n❌ Error: No Firebase credentials found.');
  console.error('   Set one of the following in your .env file:');
  console.error('   • FIREBASE_SERVICE_ACCOUNT_JSON=<raw-json-string>');
  console.error('   • GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json');
  console.error('\n   Never commit credentials to Git.\n');
  process.exit(1);
}

// ------------------------------------------------------------------
// Initialize Firebase Admin
// ------------------------------------------------------------------
const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(app);

// ------------------------------------------------------------------
// Read seed data
// ------------------------------------------------------------------
const seedDataPath = join(__dirname, '..', 'SEED_DATA.json');
let seedData;
try {
  seedData = JSON.parse(readFileSync(seedDataPath, 'utf8'));
} catch (err) {
  console.error(`❌ Failed to read ${seedDataPath}:`, err.message);
  process.exit(1);
}

if (!Array.isArray(seedData) || seedData.length === 0) {
  console.error('❌ SEED_DATA.json is empty or invalid.');
  process.exit(1);
}

// ------------------------------------------------------------------
// Seed products into Firestore
// ------------------------------------------------------------------
async function seedProducts() {
  console.log(`\n🌱 Seeding ${seedData.length} products into Firestore...\n`);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const product of seedData) {
    if (!product.id) {
      console.error(`   ⚠️  Skipped (no ID): ${product.name || 'Unknown'}`);
      skipped++;
      continue;
    }

    const ref = db.collection('products').doc(product.id);

    try {
      const snap = await ref.get();
      const now = Timestamp.now();

      const data = {
        ...product,
        updatedAt: now
      };

      if (!snap.exists) {
        data.createdAt = now;
        await ref.set(data);
        console.log(`   ✅ Created: ${product.id}`);
        created++;
      } else {
        // Merge to preserve any fields that might have been added manually
        // but ensure seed data fields are synchronized
        await ref.set(data, { merge: true });
        console.log(`   🔄 Updated: ${product.id}`);
        updated++;
      }
    } catch (err) {
      console.error(`   ❌ Failed: ${product.id} — ${err.message}`);
      errors++;
    }
  }

  console.log(`\n───────────────────────────────────────`);
  console.log(`   Created : ${created}`);
  console.log(`   Updated : ${updated}`);
  console.log(`   Skipped : ${skipped}`);
  console.log(`   Errors  : ${errors}`);
  console.log(`───────────────────────────────────────\n`);

  if (errors > 0) {
    console.error('❌ Seeding completed with errors.\n');
    process.exit(1);
  } else {
    console.log('✅ Firestore product catalogue is synchronized.\n');
    process.exit(0);
  }
}

seedProducts().catch(err => {
  console.error('❌ Unexpected error during seeding:', err);
  process.exit(1);
});
