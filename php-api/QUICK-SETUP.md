# 🚀 Quick Setup Instructions

## ⚡ CORS Issue Fixed!

The CORS headers have been updated in both `config/database.php` and `.htaccess` to allow requests from any origin.

## 📋 Quick Steps to Get Running:

### 1. Upload Files to Namecheap
Upload ALL files from this `php-api` folder to:
```
public_html/bodymaster/
```

Your structure should be:
```
public_html/
  └── bodymaster/
      ├── .htaccess
      ├── config/
      │   └── database.php
      ├── clients.php
      ├── clients-detail.php
      ├── coaches.php
      ├── coaches-detail.php
      ├── payments.php
      ├── payments-detail.php
      ├── promotions.php
      ├── promotions-detail.php
      ├── presence.php
      └── presence-detail.php
```

### 2. Edit Database Config
Edit `bodymaster/config/database.php` (lines 15-18):
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'your_db_name');     // ← Change this
define('DB_USER', 'your_username');     // ← Change this
define('DB_PASS', 'your_password');     // ← Change this
```

### 3. Import Database
1. Open phpMyAdmin in cPanel
2. Select your database
3. Click "Import"
4. Upload `schema.sql`
5. Click "Go"

### 4. Test API
Visit: `https://www.quicktemplatepro.com/bodymaster/clients.php`

You should see `[]` (empty array) if no data, or JSON data if it works!

## ✅ CORS Headers Included

The following headers are now in your PHP files:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
```

This allows your Next.js app (running on localhost:3000 or any domain) to access your PHP API!

## 🎯 That's It!

Once you:
1. ✅ Upload PHP files
2. ✅ Configure database credentials
3. ✅ Import schema.sql

Your app will work perfectly! The frontend is already configured to use:
`https://www.quicktemplatepro.com/bodymaster/`
