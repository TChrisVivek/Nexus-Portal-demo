const fs = require('fs');
const storePath = 'D:/cmm-grid-template/src/data/store.json';
const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));

// Delete mistakenly added 'inventory'
if (store.inventory) delete store.inventory;

// Products, Projects, Allocations (assuming they are already correctly formatted in mockData or we use what's in store)
// Actually we have them in mockData, let's just make sure they are in store.products
const mockData = require('D:/cmm-grid-template/src/lib/mockData.ts'); // Wait, we can't require .ts directly without ts-node
