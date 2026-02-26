const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'hotel.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeTables();
  }
});

function initializeTables() {
  db.serialize(() => {
    // Orders table
    db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        address TEXT,
        items TEXT NOT NULL,
        total REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        payment_status TEXT DEFAULT 'unpaid',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Error creating orders table:', err);
      else console.log('Orders table ready');
    });

    // Contacts table
    db.run(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT NOT NULL,
        subject TEXT,
        message TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Error creating contacts table:', err);
      else console.log('Contacts table ready');
    });

    // Admin users table
    db.run(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Error creating admin_users table:', err);
      else {
        console.log('Admin users table ready');
        checkAdminExists();
      }
    });

    // Inventory table
    db.run(`
      CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_name TEXT UNIQUE NOT NULL,
        quantity REAL NOT NULL DEFAULT 0,
        unit TEXT DEFAULT 'pcs',
        low_stock_threshold REAL DEFAULT 10,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Error creating inventory table:', err);
      else console.log('Inventory table ready');
    });

    // Expenses table
    db.run(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT DEFAULT 'General',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Error creating expenses table:', err);
      else console.log('Expenses table ready');
    });

    // Menu items table (for editable food menu)
    db.run(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        image TEXT,
        description TEXT,
        category TEXT,
        badge TEXT,
        tags TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Error creating menu_items table:', err);
      else {
        console.log('Menu items table ready');
        // seed sample items if none exist
        seedMenuItems();
      }
    });

    function seedMenuItems() {
      db.get('SELECT COUNT(*) as cnt FROM menu_items', (err, row) => {
        if (err) {
          console.error('Error checking menu items count:', err);
          return;
        }
        if (row && row.cnt === 0) {
          const sample = [
            { name: 'Sample Coffee', price: 120, image: '' },
            { name: 'Sample Sandwich', price: 250, image: '' }
          ];
          const stmt = db.prepare('INSERT INTO menu_items (name, price, image) VALUES (?, ?, ?)');
          sample.forEach(item => stmt.run(item.name, item.price, item.image));
          stmt.finalize(() => console.log('Sample menu items seeded'));
        }
      });
    }
  });
}

function checkAdminExists() {
  db.get('SELECT * FROM admin_users WHERE username = ?', ['admin'], (err, row) => {
    if (err) {
      console.error('Error checking admin:', err);
      return;
    }

    if (!row) {
      // Insert default admin user (hash in production!)
      const bcrypt = require('bcryptjs');
      const hashedPassword = bcrypt.hashSync('garcelight#9810', 10);
      db.run(
        'INSERT INTO admin_users (username, password) VALUES (?, ?)',
        ['admin', hashedPassword],
        (err) => {
          if (err) console.error('Error inserting admin:', err);
          else console.log('Default admin user created');
        }
      );
    }
  });
}

// Export database instance and utilities
module.exports = db;
