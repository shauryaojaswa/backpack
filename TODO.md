# Publish Readiness Checklist

- [ ] Create public/index.html (copy from root)
- [ ] Create public/admin.html (copy from root)
- [ ] Create public/app.js (copy from root)
- [ ] Create public/customer.js (copy from root + fix duplicate menu item)
- [ ] Create public/admin.js (copy from root + fix dead status buttons)
- [ ] Create public/style.css (copy from root)
- [ ] Remove root duplicates (index.html, admin.html, app.js, customer.js, admin.js, style.css)
- [ ] Remove placeholder files (seed.js, costumer.js)
- [ ] Harden firestore.rules (restrict order reads/writes)
- [ ] Update package.json start script to serve public/
- [ ] Update README.md with accurate publish instructions
- [ ] Test locally with http server
- [ ] Verify app loads correctly
