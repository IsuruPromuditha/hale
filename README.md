# HALE: Editorial Menswear Storefront & Headless CMS

A minimalist editorial fashion storefront built with **React, TypeScript, Tailwind CSS, GSAP (ScrollTrigger), Express, and MySQL / phpMyAdmin** integration.

The design centers on a physical garment rail in 3D space. Pieces hang along a brushed-steel hanger bar, turn forward as you scroll or brush past them, lift off the rail for size selection and fabric inspection, and fit automatically onto a unified studio tailor's dummy. The project includes a built-in headless CMS, a per-size inventory dashboard, express checkout with live stock deduction, and phpMyAdmin SQL import/export.

## Features

### 3D Perspective Garment Rail (`#rail`)
- Interactive Autumn 26 rack with garments suspended from oak hangers along a continuous brushed-steel rail
- Scroll-driven GSAP ScrollTrigger gliding, pointer brush-past navigation, and keyboard arrow support
- Lift-off inspection modes: **On Hanger**, **On Dummy**, **Turn Piece**

### Studio Dummy Fitting Room
- Scroll-scrubbed and click-driven outfit switcher ("One dummy, eight pieces.")
- A linen tailor's dummy wearing charcoal pleated wool trousers and black leather derbies
- Click any piece (01 to 08) to fit it onto the dummy, with quick size selection and **Add to bag**

### Editorial Lookbook & Workshop (`#lookbook` & `#studio`)
- Full-bleed parallax street banner ("Out the door by eight")
- Courtyard Lookbook 01 with **Shop the look**
- Porto workshop narrative, 5-frame "Out in it" field notes strip, and 3-column "Our promises" grid

### Slide-Over Bag Drawer & Express Checkout
- Live header item counter and $250 complimentary shipping progress bar
- Stock-aware quantity steppers and order confirmation receipt
- Automatic inventory deduction on checkout

### Headless CMS & Inventory Admin Dashboard
- First-run passcode claim (scrypt hashed) or environment passcode sign-in (`ADMIN_PASSCODE`)
- **Products & Rail CRUD:** add, edit, reorder, publish/hide, or delete garments, with a one-click Sample Studio Assets picker (`/src/assets/images/`)
- **Inventory Matrix:** inline XS to XL stock editor with low-stock (3 or fewer) and out-of-stock alerts
- **Headless CMS:** live editor for storefront headlines, lookbook copy, studio hours, and the free shipping threshold
- **Orders & Fulfillment:** track customer orders and update status (Pending, Packed, Shipped, Delivered, Cancelled)

### phpMyAdmin / MySQL Integration
- Uses `mysql2` parameterized queries when `MYSQL_HOST` or `MYSQL_URL` is configured, and auto-creates tables and seeds the catalog on boot
- Falls back to a local persistent store (`data/hale-store.json`) when no MySQL server is available
- Includes `database/hale_phpmyadmin.sql` and a one-click **Export .sql** for phpMyAdmin in the Admin Dashboard

## Tech Stack

| Layer     | Technologies |
| --------- | ------------ |
| Frontend  | React 19, TypeScript, Tailwind CSS v4, GSAP (`gsap` + ScrollTrigger), Lucide Icons |
| Backend   | Node.js, Express, tsx, mysql2 |
| Database  | MySQL 8+ / MariaDB (phpMyAdmin compatible) with local JSON store fallback |

## Project Structure

```text
├── database/
│   └── hale_phpmyadmin.sql       # MySQL / MariaDB schema & seed for phpMyAdmin import
├── public/img/                   # Static SVG hanger artwork
├── server/
│   └── db.ts                     # Dual-mode MySQL + local store repository & auth helpers
├── src/
│   ├── assets/images/            # Garment hanger, dummy statue & editorial photos
│   ├── components/
│   │   ├── AdminDashboard.tsx    # CMS, Inventory Matrix, Orders & phpMyAdmin export UI
│   │   ├── BagDrawer.tsx         # Slide-over cart & checkout drawer
│   │   ├── EditorialSections.tsx # Banner, Lookbook, Workshop, Field Notes & Promises
│   │   ├── Footer.tsx            # Bottom rail banner & 4-column studio footer
│   │   ├── Header.tsx            # 3-zone sticky editorial header
│   │   ├── RailSection.tsx       # CSS 3D hanger rail & garment inspector
│   │   ├── ResilientImage.tsx    # Zero-broken-image wrapper with studio fallback
│   │   └── TryItOnSection.tsx    # Scroll-scrubbed & click-to-fit tailor dummy stage
│   ├── context/StoreContext.tsx  # Live catalog, bag state & session memory
│   ├── data/catalog.ts           # Default Autumn 26 catalog, CMS copy & sample presets
│   └── types/hale.ts             # Shared TypeScript interfaces
├── server.ts                     # Express API + Vite dev/static server (port 3000)
└── .env.example                  # Environment variable template
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your values:

```env
# Optional: MySQL / phpMyAdmin connection (omit to use local persistent store)
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=
MYSQL_PASSWORD=
MYSQL_DATABASE=hale_store

# Optional: fixed Admin Dashboard passcode (leave blank for first-run UI setup)
ADMIN_PASSCODE=
SESSION_SECRET=
```

### 3. Run in development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). `server.ts` serves both the Vite React frontend and the `/api/*` Express backend on port 3000.

### 4. Build and run in production

```bash
npm run build
npm start
```

## Connecting phpMyAdmin (MySQL / MariaDB)

1. Open phpMyAdmin and create a database named `hale_store`, or import `database/hale_phpmyadmin.sql` directly via the **Import** tab.
2. Add your `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, and `MYSQL_DATABASE` credentials to `.env`.
3. Restart the server (`npm run dev`).
4. Verify the live database connection in **Admin → phpMyAdmin / SQL**, where you can also download a fresh `.sql` snapshot at any time.

## API Endpoints

| Method                | Endpoint                    | Access | Description |
| --------------------- | --------------------------- | ------ | ----------- |
| GET                   | `/api/health`               | Public | Server and database engine status |
| GET                   | `/api/catalog`              | Public | Published rail garments, size stock & CMS copy |
| GET                   | `/api/cms`                  | Public | Storefront editorial CMS configuration |
| POST                  | `/api/orders`               | Public | Place order and decrement size inventory |
| GET                   | `/api/admin/auth-status`    | Public | Check if first-run admin claim is required |
| POST                  | `/api/admin/claim`          | Public | One-time first-run admin passcode setup |
| POST                  | `/api/admin/login`          | Public | Verify passcode and issue Bearer token |
| GET/POST/PUT/DELETE   | `/api/admin/products`       | Admin  | Manage garments & rail order |
| PATCH                 | `/api/admin/inventory/:id`  | Admin  | Update XS to XL size stock quantities |
| PUT                   | `/api/admin/cms`            | Admin  | Update storefront editorial CMS blocks |
| GET/PATCH             | `/api/admin/orders`         | Admin  | View orders & update fulfillment status |
| GET                   | `/api/admin/export-sql`     | Admin  | Download live phpMyAdmin-compatible `.sql` dump |

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "Add my feature"`
4. Push the branch: `git push origin feature/my-feature`
5. Open a Pull Request

## License

This project is licensed under the [MIT License](LICENSE).
