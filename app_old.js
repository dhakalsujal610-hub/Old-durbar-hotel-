const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// serve static assets from the "public" directory (or current folder if you prefer)
app.use(express.static(path.join(__dirname, 'public')));

// simple in-memory storage (persisted to JSON file)
let contacts = [];
let orders = [];

// load existing data if present
const contactsFile = path.join(__dirname, 'contacts.json');
const ordersFile = path.join(__dirname, 'orders.json');
if (fs.existsSync(contactsFile)) {
  try { contacts = JSON.parse(fs.readFileSync(contactsFile, 'utf-8')); } catch {};
}
if (fs.existsSync(ordersFile)) {
  try { orders = JSON.parse(fs.readFileSync(ordersFile, 'utf-8')); } catch {};
}

app.post('/api/contact', (req, res) => {
  const { name, phone, email, subject, message } = req.body;
  const entry = {
    id: contacts.length + 1,
    name,
    phone,
    email,
    subject,
    message,
    date: new Date()
  };
  contacts.push(entry);
  fs.writeFileSync(contactsFile, JSON.stringify(contacts, null, 2));
  res.json({ success: true, message: 'Thank you for contacting us!' });
});

app.get('/api/contacts', (req, res) => {
  res.json(contacts);
});

app.post('/api/orders', (req, res) => {
  const order = req.body;
  order.id = orders.length + 1;
  order.date = new Date();
  orders.push(order);
  fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));
  res.json({ success: true, orderId: order.id });
});

app.get('/api/orders', (req, res) => {
  res.json(orders);
});

app.delete('/api/contacts/:id', (req, res) => {
  const id = parseInt(req.params.id);
  contacts = contacts.filter(c => c.id !== id);
  fs.writeFileSync(contactsFile, JSON.stringify(contacts, null, 2));
  res.json({ success: true, message: 'Contact deleted' });
});

app.delete('/api/orders/:id', (req, res) => {
  const id = parseInt(req.params.id);
  orders = orders.filter(o => o.id !== id);
  fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));
  res.json({ success: true, message: 'Order deleted' });
});

// fallback handler for any other route - serve index.html (SPA style)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});