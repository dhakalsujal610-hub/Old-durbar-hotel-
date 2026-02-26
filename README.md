# Full Stack Website

This project was originally a static frontend with several HTML pages. It has been converted into a simple Node.js/Express full‑stack application.

> **Note:** `app.js` is an old version of the server and is kept only for reference; the current backend is implemented in `server.js` and is started via `npm start`.

## Structure

```
Day 1/
├── app.js              # Express server
├── package.json
├── package-lock.json
├── public/             # static frontend files
│   ├── index.html
│   ├── yumy.html
│   └── ...             # additional pages or assets
├── contacts.json       # generated when contact form is used
└── orders.json         # generated when orders are submitted
```

> **Note:** There are other subfolders (e.g. `hotel websie`) from earlier work that are unrelated to this conversion.

## Getting started

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Start the server**
   - Production: `npm start`
   - Development (with auto‑reload): `npm run dev`

3. Open `http://localhost:3000` in your browser.

## Features added

- Express server serving static files from `public/`
- `/api/contact` endpoint storing submissions in `contacts.json`
- `/api/orders` endpoint for receiving order data (cart is sent from frontend)
- Sample static pages have been updated to POST to these endpoints instead of using only localStorage
- JSON files are used for persistence, but you can replace them with a real database (Mongo, PostgreSQL, etc.)

## Future improvements

- Add user authentication and admin dashboard
- Move inline styles/scripts into separate files
- Implement real database for orders/contacts
- Deploy to a hosting provider (Heroku, Vercel, etc.)

Enjoy building your full‑stack website! 👍