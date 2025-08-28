// MongoDB initialization script for Docker setup
// This script runs when the MongoDB container starts for the first time

print('🚀 Initializing MongoDB for Grup application...');

// Switch to the application database
db = db.getSiblingDB('grup-production');

// Create application user (if authentication is enabled)
try {
  db.createUser({
    user: 'grup_user',
    pwd: 'grup_password', // Change this in production
    roles: [
      { role: 'readWrite', db: 'grup-production' },
      { role: 'dbAdmin', db: 'grup-production' }
    ]
  });
  print('✅ Application user created successfully');
} catch (error) {
  print('ℹ️  User already exists or authentication disabled');
}

// Create collections with proper indexes
const collections = [
  'users',
  'products', 
  'orders',
  'groupbuys',
  'wallets',
  'transactions',
  'notifications',
  'uploadedimages',
  'paymenthistories',
  'liveusersessions',
  'shoppingregions',
  'carts'
];

collections.forEach(collectionName => {
  try {
    db.createCollection(collectionName);
    print(`✅ Collection '${collectionName}' created`);
  } catch (error) {
    print(`ℹ️  Collection '${collectionName}' already exists`);
  }
});

// Create indexes for better performance
print('📊 Creating database indexes...');

// Users collection indexes
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "phone": 1 });
db.users.createIndex({ "referralCode": 1 }, { unique: true });
db.users.createIndex({ "createdAt": -1 });

// Products collection indexes
db.products.createIndex({ "name": "text", "description": "text" });
db.products.createIndex({ "category": 1 });
db.products.createIndex({ "price": 1 });
db.products.createIndex({ "createdAt": -1 });

// Orders collection indexes
db.orders.createIndex({ "user": 1 });
db.orders.createIndex({ "currentStatus": 1 });
db.orders.createIndex({ "createdAt": -1 });
db.orders.createIndex({ "trackingNumber": 1 });

// GroupBuys collection indexes
db.groupbuys.createIndex({ "productId": 1 });
db.groupbuys.createIndex({ "status": 1 });
db.groupbuys.createIndex({ "expiresAt": 1 });

// Wallets collection indexes
db.wallets.createIndex({ "user": 1 }, { unique: true });
db.wallets.createIndex({ "balance": 1 });

// Transactions collection indexes
db.transactions.createIndex({ "wallet": 1 });
db.transactions.createIndex({ "user": 1 });
db.transactions.createIndex({ "createdAt": -1 });

// Notifications collection indexes
db.notifications.createIndex({ "userId": 1 });
db.notifications.createIndex({ "userId": 1, "read": 1 });
db.notifications.createIndex({ "createdAt": -1 });

// UploadedImages collection indexes
db.uploadedimages.createIndex({ "createdAt": -1 });
db.uploadedimages.createIndex({ "isUsed": 1 });

print('✅ All indexes created successfully');

// Insert some initial data if collections are empty
if (db.shoppingregions.countDocuments() === 0) {
  print('🌍 Inserting default shopping regions...');
  
  const defaultRegions = [
    {
      name: "Lagos",
      state: "Lagos",
      deliveryFee: 1000,
      estimatedDeliveryDays: "2-3 days",
      isActive: true
    },
    {
      name: "Abuja", 
      state: "FCT",
      deliveryFee: 1200,
      estimatedDeliveryDays: "3-4 days",
      isActive: true
    },
    {
      name: "Port Harcourt",
      state: "Rivers",
      deliveryFee: 1500,
      estimatedDeliveryDays: "4-5 days",
      isActive: true
    }
  ];
  
  db.shoppingregions.insertMany(defaultRegions);
  print('✅ Default shopping regions inserted');
}

print('🎉 MongoDB initialization completed successfully!');
print('📊 Database: grup-production');
print('🔗 Ready for Grup application connection');

