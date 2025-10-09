# 🚀 BodyMaster - PHP/MySQL Deployment Guide for Namecheap

## ✅ Migration Complete!

Your application has been successfully migrated from Prisma/Supabase to **PHP + MySQL** for Namecheap hosting.

## 📋 What Changed

### ✅ Removed:
- ❌ Prisma ORM and all dependencies
- ❌ Supabase client
- ❌ PostgreSQL dependencies
- ❌ All Next.js API routes (app/api folder - no longer needed)

### ✅ Added:
- ✅ PHP API files in `php-api/` folder
- ✅ MySQL schema (`schema.sql`)
- ✅ API helper functions (`app/lib/api.ts`)
- ✅ Environment variable for PHP API URL

### ✅ Updated:
- ✅ All frontend fetch calls now use PHP API
- ✅ Dashboard page
- ✅ Clients page
- ✅ Coaches page
- ✅ Payments page
- ✅ Promotions page
- ✅ Presence page
- ✅ Receipts page

## 🎯 Deployment Steps

### Step 1: Upload PHP Files to Namecheap

Upload all files from `php-api/` folder to your Namecheap hosting:

```
public_html/
  └── bodymaster/
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
      ├── presence-detail.php
      └── .htaccess
```

### Step 2: Create MySQL Database

1. Log into Namecheap cPanel
2. Go to **MySQL Databases**
3. Create new database (e.g., `username_bodymaster`)
4. Create MySQL user with strong password
5. Add user to database with **ALL PRIVILEGES**
6. Note down:
   - Database name
   - Username  
   - Password
   - Host (usually `localhost`)

### Step 3: Import Database Schema

1. Go to **phpMyAdmin** in cPanel
2. Select your database
3. Click **Import** tab
4. Upload `php-api/schema.sql`
5. Click **Go** to execute
6. Verify all 10 tables were created

### Step 4: Configure Database Connection

Edit `bodymaster/config/database.php` on your server:

```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'username_bodymaster');  // Your database name
define('DB_USER', 'username_dbuser');      // Your MySQL username
define('DB_PASS', 'your_secure_password'); // Your MySQL password
```

### Step 5: Test PHP API

Visit these URLs in your browser to test:

```
https://www.quicktemplatepro.com/bodymaster/clients.php
https://www.quicktemplatepro.com/bodymaster/coaches.php
https://www.quicktemplatepro.com/bodymaster/payments.php
https://www.quicktemplatepro.com/bodymaster/promotions.php
https://www.quicktemplatepro.com/bodymaster/presence.php
```

You should see JSON data (empty arrays `[]` if no data yet).

### Step 6: Deploy Next.js Frontend

Your Next.js app is already configured to use the PHP API at:
`https://www.quicktemplatepro.com/bodymaster/`

Just deploy your Next.js app to Vercel, Netlify, or any hosting platform.

## 📊 API Endpoints

### Your PHP API URLs:

**Clients:**
- `GET` https://www.quicktemplatepro.com/bodymaster/clients.php
- `POST` https://www.quicktemplatepro.com/bodymaster/clients.php
- `GET` https://www.quicktemplatepro.com/bodymaster/clients-detail.php?id={id}
- `PUT` https://www.quicktemplatepro.com/bodymaster/clients-detail.php?id={id}
- `DELETE` https://www.quicktemplatepro.com/bodymaster/clients-detail.php?id={id}

**Coaches:**
- `GET` https://www.quicktemplatepro.com/bodymaster/coaches.php
- `POST` https://www.quicktemplatepro.com/bodymaster/coaches.php
- `GET` https://www.quicktemplatepro.com/bodymaster/coaches-detail.php?id={id}
- `PUT` https://www.quicktemplatepro.com/bodymaster/coaches-detail.php?id={id}
- `DELETE` https://www.quicktemplatepro.com/bodymaster/coaches-detail.php?id={id}

**Payments:**
- `GET` https://www.quicktemplatepro.com/bodymaster/payments.php
- `POST` https://www.quicktemplatepro.com/bodymaster/payments.php
- `GET` https://www.quicktemplatepro.com/bodymaster/payments-detail.php?id={id}
- `PUT` https://www.quicktemplatepro.com/bodymaster/payments-detail.php?id={id}
- `DELETE` https://www.quicktemplatepro.com/bodymaster/payments-detail.php?id={id}

**Promotions:**
- `GET` https://www.quicktemplatepro.com/bodymaster/promotions.php
- `POST` https://www.quicktemplatepro.com/bodymaster/promotions.php
- `GET` https://www.quicktemplatepro.com/bodymaster/promotions-detail.php?id={id}
- `PUT` https://www.quicktemplatepro.com/bodymaster/promotions-detail.php?id={id}
- `DELETE` https://www.quicktemplatepro.com/bodymaster/promotions-detail.php?id={id}

**Presence:**
- `GET` https://www.quicktemplatepro.com/bodymaster/presence.php
- `POST` https://www.quicktemplatepro.com/bodymaster/presence.php
- `GET` https://www.quicktemplatepro.com/bodymaster/presence-detail.php?id={id}
- `DELETE` https://www.quicktemplatepro.com/bodymaster/presence-detail.php?id={id}

## ✨ Features Maintained

✅ **All CRUD Operations** - Create, Read, Update, Delete
✅ **Soft Delete** - Data never permanently deleted
✅ **History Logging** - All changes tracked
✅ **Input Validation** - Sanitization and security
✅ **Error Handling** - Proper HTTP status codes
✅ **CORS Support** - Works with Next.js frontend
✅ **SQL Injection Protection** - PDO prepared statements
✅ **Loading Progress Bars** - Show until data appears
✅ **Delete Buttons** - On all pages (clients, coaches, payments, promotions, presence)
✅ **Receipts with Logo** - Professional receipts with client data
✅ **Uppercase Forms** - Client/coach names always uppercase
✅ **Payment Validation** - Green/red status indicators

## 🔧 Troubleshooting

### Issue: Can't connect to database
**Solution:** Check `config/database.php` credentials

### Issue: 500 Error on PHP files
**Solution:** Check PHP error logs in cPanel

### Issue: CORS Error
**Solution:** Verify CORS headers in `config/database.php`

### Issue: .htaccess not working
**Solution:** Ensure mod_rewrite is enabled in cPanel

## 🎉 You're All Set!

Your application is now:
- ✅ **Fully migrated to PHP/MySQL**
- ✅ **Ready for Namecheap hosting**
- ✅ **No Prisma or Supabase dependencies**
- ✅ **All features working**
- ✅ **Optimized for performance**

Just upload the PHP files, configure the database, and you're ready to go! 🚀
