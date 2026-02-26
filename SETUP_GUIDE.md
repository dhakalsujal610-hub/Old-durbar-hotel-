# hotel Admin Dashboard - Production Setup Guide

## System Overview

A professional, production-ready admin dashboard for managing hotel orders and customer contacts with:
- SQLite database persistence
- Secure session-based authentication
- Real-time order management with status tracking
- Contact message management
- Responsive design for all devices
- Toast notifications
- Advanced filtering and sorting

---

## Project Structure

```
Day 1/
├── server.js                 # Main Express server
├── db.js                     # SQLite database initialization
├── package.json              # Dependencies & scripts
├── hotel.db                   # SQLite database (auto-created)
├── .env                      # Environment variables (optional)
├── public/
│   ├── index.html           # Customer-facing homepage
│   ├── admin/
│   │   ├── login.html       # Admin login page
│   │   ├── dashboard.html   # Admin dashboard UI
│   │   ├── admin.js         # Dashboard JavaScript
│   │   └── admin.css        # Dashboard styling
│   └── ... (other frontend files)
├── node_modules/            # Dependencies (auto-created)
└── README.md
```

---

## Setup Instructions

### Step 1: Stop Current Server
```bash
# If server is running, stop it using Ctrl+C
```

### Step 2: Verify Node.js Installation
```bash
node --version  # Should show v14+ or higher
npm --version   # Should show npm version
```

### Step 3: Install Dependencies (Already Done)
Dependencies are already installed. If needed, run:
```bash
npm install
```

### Step 4: Delete Old Database (Fresh Start)
To start fresh with new schema, delete the old database:
```bash
del hotel.db
```

### Step 5: Start the Server
```bash
npm run dev
```
You should see:
```
Connected to SQLite database
Orders table ready
Contacts table ready
Admin users table ready
Default admin user created
🍔 hotel Admin Server listening on http://localhost:3000
📊 Admin Panel: http://localhost:3000/admin/login
```

### Step 6: Access the Application

**Customer Application:**
- URL: http://localhost:3000
- Full menu, ordering system, contact forms

**Admin Login:**
- URL: http://localhost:3000/admin/login
- Username: `admin`
- Password: `garcelight#9810`

---

## Admin Dashboard Features 

### 1. Dashboard Section
Six stat cards showing:
- **Total Contacts** - All contact form submissions
- **Total Orders** - All orders received
- **Total Revenue** - Sum of all order amounts
- **Today's Orders** - Orders placed today
- **Pending Orders** - Orders status = 'pending'
- **Completed Orders** - Orders status = 'completed'

Stats auto-refresh every 30 seconds.

### 2. Order Management
Complete order management with:

**Search & Filter:**
- Search by customer name
- Search by phone number
- Filter by order status (Pending, Preparing, Completed, Cancelled)
- Sort by (Newest, Oldest, Highest Amount, Lowest Amount)

**Order Table Columns:**
- Order ID - Unique identifier
- Customer - Customer name
- Phone - Customer phone number
- Items - Clickable to view details
- Total - Order amount in rupees
- Status - Current status badge
- Payment - Payment status (Paid/Unpaid)
- Date - Order creation date
- Action - Edit status or delete

**Order Actions:**
- **View Details** - Click items count to see full order details
  - Customer information
  - Itemized list with quantities and prices
  - Total amount
  - Status and payment info
  
- **Change Status** - Update order processing status
  - Select new status: Pending, Preparing, Completed, Cancelled
  - Update payment status: Paid or Unpaid
  
- **Delete** - Remove order with confirmation

### 3. Contact Management
Manage customer inquiries:

**Contact Table Columns:**
- Name - Customer name
- Email - Customer email
- Phone - Customer phone (if provided)
- Subject - Contact subject
- Message - Preview of message
- Date - Submission date
- Action - Mark as read or delete

**Contact Actions:**
- **Mark as Read** - Track which messages you've reviewed
- **Delete** - Remove contact message

---

## API Endpoints

### Authentication
```
POST /api/auth/login
  Body: { username, password }
  Response: { success, message }

POST /api/auth/logout
  Response: { success, message }

GET /api/auth/check
  Response: { authenticated, username }
```

### Orders
```
GET /api/orders
  Returns: Array of all orders [Protected]

GET /api/orders/:id
  Returns: Single order details [Protected]

POST /api/orders
  Body: { customer, items, total }
  Returns: { success, orderId }

PUT /api/orders/:id/status
  Body: { status, payment_status }
  Response: { success, message }

DELETE /api/orders/:id
  Response: { success, message }
```

### Contacts
```
GET /api/contacts
  Returns: Array of all contacts [Protected]

POST /api/contact
  Body: { name, phone, email, subject, message }
  Returns: { success, message }

PUT /api/contacts/:id/read
  Response: { success, message }

DELETE /api/contacts/:id
  Response: { success, message }
```

### Stats
```
GET /api/stats
  Returns: {
    total_contacts,
    total_orders,
    total_revenue,
    today_orders,
    pending_orders,
    completed_orders
  }
  [Protected]
```

---

## Database Schema

### Orders Table
```sql
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  items TEXT NOT NULL,        -- JSON array
  total REAL NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, preparing, completed, cancelled
  payment_status TEXT DEFAULT 'unpaid', -- paid, unpaid
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### Contacts Table
```sql
CREATE TABLE contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,  -- 0 = unread, 1 = read
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### Admin Users Table
```sql
CREATE TABLE admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,      -- bcrypt hash
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

Default admin user created with:
- Username: `admin`
- Password: `garcelight#9810` (bcrypt hashed)

---

## Security Features

✅ **Implemented:**
- Session-based authentication (express-session)
- Password hashing with bcryptjs
- Input validation on all endpoints
- Protected admin routes (isAuthenticated middleware)
- HTTP-only cookies for sessions
- CSRF protection ready (add in production)
- Environment variable support (.env file)

⚠️ **For Production:**
1. Add HTTPS/SSL certificate
2. Move credentials to .env file
3. Enable CSRF protection
4. Add rate limiting
5. Implement IP whitelisting
6. Use security headers (helmet.js)
7. Add database backups
8. Enable SameSite cookie restrictions

---

## Customization

### Change Admin Password
1. Update in db.js file (line ~50)
2. Hash with bcryptjs: `bcrypt.hashSync('newpassword', 10)`
3. Delete hotel.db and restart (creates new default user)

Or add endpoint to change password in production.

### Add New Admin Users
Modify db.js checkAdminExists() function to create additional users, or add a dedicated endpoint.

### Change Session Timeout
In server.js, modify session maxAge (currently 24 hours):
```javascript
maxAge: 24 * 60 * 60 * 1000  // in milliseconds
```

### Customize Colors
In admin.css, update CSS variables:
```css
:root {
  --primary: #667eea;        /* Blue-purple */
  --secondary: #764ba2;      /* Purple */
  --success: #10b981;        /* Green */
  --danger: #ef4444;         /* Red */
  /* ... etc */
}
```

---

## Troubleshooting

### Server won't start
```bash
# Check if port 3000 is in use
netstat -ano | findstr :3000

# Kill process using port
taskkill /PID <PID> /F

# Or use different port
PORT=3001 npm start
```

### Database errors
```bash
# Delete and recreate database
del hotel.db
npm start
```

### Login not working
- Check username: `admin`
- Check password: `garcelight#9810`
- Ensure /api/auth/login endpoint is accessible
- Check browser console for errors

### Orders not showing
- Verify customer placed order (check /api/orders response)
- Check database: `SELECT * FROM orders;`
- Ensure authentication is valid

---

## Performance Tips

1. **Pagination** - Add pagination for large order lists
2. **Caching** - Cache stats for frequently accessed data
3. **Indexing** - Add indexes to customer_name, phone, created_at
4. **Connection Pooling** - For larger deployments, use connection pool
5. **Lazy Loading** - Load large tables with pagination

---

## Deployment Checklist

- [ ] Set NODE_ENV=production
- [ ] Use strong admin password
- [ ] Enable HTTPS
- [ ] Set secure environment variables in .env
- [ ] Enable CORS if frontend is separate
- [ ] Set up database backups
- [ ] Configure logging
- [ ] Test all authentication flows
- [ ] Verify data validation
- [ ] Set up monitoring/alerts
- [ ] Document all endpoints

---

## Development & Monitoring

### Start Development Server with Auto-Reload
```bash
npm run dev
```

### Production Server
```bash
npm start
```

### View Database Contents
Install SQLite browser extension for VS Code, or use command line:
```bash
sqlite3 hotel.db
.tables
SELECT * FROM orders;
.quit
```

---

## Next Steps

1. ✅ System is ready to use
2. Test all features in admin dashboard
3. Customize branding and colors
4. Add more menu items to homepage (use admin panel to edit menu items, including prices and images)

### Menu Management
- Navigate to **Menu** tab in admin dashboard (two sample items are added automatically on first run)
- Click **Add Item** to create new food entry
- Edit name, price, and upload a new image
- Use **Edit** and **Delete** actions on existing items
- Changes are reflected on the public homepage automatically after reload

5. Set up database backups
6. Deploy to production server

---

**Support & Questions:**
Check console logs for detailed error messages.
All API responses are JSON formatted.

Happy managing your hotel! 🍔📊