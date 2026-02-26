(async () => {
  try {
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'garcelight#9810' })
    });
    const body = await res.text();
    console.log('status', res.status);
    console.log('body', body);
  } catch (err) {
    console.error(err);
  }
})();