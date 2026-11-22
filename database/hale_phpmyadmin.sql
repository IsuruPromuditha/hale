-- HALE Editorial Storefront — phpMyAdmin / MySQL 8+ & MariaDB Schema & Seed
-- Import this file directly via phpMyAdmin -> Import tab.

CREATE DATABASE IF NOT EXISTS `hale_store`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `hale_store`;

CREATE TABLE IF NOT EXISTS `products` (
  `id` VARCHAR(64) NOT NULL,
  `sku` VARCHAR(64) NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 1,
  `name` VARCHAR(160) NOT NULL,
  `color_variant` VARCHAR(120) NOT NULL,
  `category` ENUM('Jersey', 'Shirting', 'Outerwear', 'Knitwear') NOT NULL DEFAULT 'Outerwear',
  `price` DECIMAL(10, 2) NOT NULL,
  `description` TEXT NOT NULL,
  `material` VARCHAR(255) NOT NULL,
  `fit` VARCHAR(255) NOT NULL,
  `front_image` VARCHAR(512) NOT NULL,
  `flat_image` VARCHAR(512) NOT NULL,
  `model_image` VARCHAR(512) NOT NULL,
  `model_overlay_mode` ENUM('native', 'composite') NOT NULL DEFAULT 'composite',
  `swatch_hex` VARCHAR(16) NOT NULL DEFAULT '#3A3B3D',
  `is_published` TINYINT(1) NOT NULL DEFAULT 1,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_products_sku` (`sku`),
  KEY `idx_products_sort` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `product_inventory` (
  `product_id` VARCHAR(64) NOT NULL,
  `size` ENUM('XS', 'S', 'M', 'L', 'XL') NOT NULL,
  `stock_qty` INT NOT NULL DEFAULT 0,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`product_id`, `size`),
  CONSTRAINT `fk_inventory_product`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cms_sections` (
  `section_key` VARCHAR(64) NOT NULL,
  `payload_json` JSON NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`section_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `orders` (
  `id` VARCHAR(64) NOT NULL,
  `order_number` VARCHAR(32) NOT NULL,
  `customer_name` VARCHAR(160) NOT NULL,
  `customer_email` VARCHAR(190) NOT NULL,
  `shipping_address` TEXT NOT NULL,
  `status` ENUM('Pending', 'Packed', 'Shipped', 'Delivered', 'Cancelled') NOT NULL DEFAULT 'Pending',
  `subtotal` DECIMAL(10, 2) NOT NULL,
  `shipping_fee` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `total` DECIMAL(10, 2) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_orders_number` (`order_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `order_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` VARCHAR(64) NOT NULL,
  `product_id` VARCHAR(64) NOT NULL,
  `sku` VARCHAR(64) NOT NULL,
  `name` VARCHAR(160) NOT NULL,
  `color_variant` VARCHAR(120) NOT NULL,
  `size` ENUM('XS', 'S', 'M', 'L', 'XL') NOT NULL,
  `quantity` INT NOT NULL,
  `unit_price` DECIMAL(10, 2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_order_items_order` (`order_id`),
  CONSTRAINT `fk_order_items_order`
    FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `admin_config` (
  `config_key` VARCHAR(64) NOT NULL,
  `config_value` TEXT NOT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed 8 Autumn 26 Garments
INSERT INTO `products` (
  `id`, `sku`, `sort_order`, `name`, `color_variant`, `category`, `price`,
  `description`, `material`, `fit`, `front_image`, `flat_image`, `model_image`,
  `model_overlay_mode`, `swatch_hex`, `is_published`
) VALUES
  ('hale-01', 'HL-A26-01', 1, 'Hoodie', 'in Oat', 'Jersey', 120.00,
   'Cut from 480gsm unbrushed organic loopback cotton knitted in Barcelos. Double-lined hood, dropped shoulder seam, and dense tubular ribbing that holds its architecture after years of wear.',
   '100% Organic Loopback Cotton, 480gsm', 'Relaxed box cut, true to shoulder',
   '/img/hoodie-oat-hanger.svg', '/src/assets/images/hale_model_base_1795355191368.jpg', '/src/assets/images/hale_dummy_hoodie_oat_1795356737763.jpg',
   'native', '#DDD5C4', 1),
  ('hale-02', 'HL-A26-02', 2, 'Overshirt', 'in Slate', 'Shirting', 165.00,
   'Brushed Japanese cotton twill with a dry flannel handfeel. Finished with smoked horn buttons, twin utility chest pockets, and felled side seams built to bridge shirting and light outerwear.',
   '100% Brushed Japanese Cotton Twill, 310gsm', 'Easy straight cut, layered drape',
   '/src/assets/images/hale_overshirt_slate_1795355189702.jpg', '/src/assets/images/hale_coast_moment_1795355189749.jpg', '/src/assets/images/hale_dummy_overshirt_slate_1795356737384.jpg',
   'native', '#5A5E63', 1),
  ('hale-03', 'HL-A26-03', 3, 'Camp Shirt', 'in Ecru', 'Shirting', 135.00,
   'Woven from unbleached Normandy flax linen and combed cotton in an open slub weave. Tailored with a soft one-piece camp collar, mother-of-pearl buttons, and straight hem with side vents.',
   '55% Normandy Linen, 45% Combed Cotton', 'Airy boxy drape',
   '/src/assets/images/hale_camp_ecru_1795355190403.jpg', '/src/assets/images/hale_coast_moment_1795355189749.jpg', '/src/assets/images/hale_dummy_camp_ecru_1795356737552.jpg',
   'native', '#EAE3D2', 1),
  ('hale-04', 'HL-A26-04', 4, 'Chore Jacket', 'in Olive', 'Outerwear', 240.00,
   'Our benchmark workshop silhouette in dry-waxed Scottish organic cotton canvas. Unlined for year-round layering with three reinforced patch pockets, internal blueprint pocket, and corozo nut buttons.',
   '100% Dry-Waxed Organic Canvas, 410gsm', 'Structured utility block',
   '/src/assets/images/hale_chore_olive_1795355190250.jpg', '/src/assets/images/hale_lookbook_courtyard_1795355191531.jpg', '/src/assets/images/hale_dummy_chore_olive_1795356737699.jpg',
   'native', '#595F45', 1),
  ('hale-05', 'HL-A26-05', 5, 'Overcoat', 'in Espresso', 'Outerwear', 460.00,
   'Hand-finished double-faced Italian virgin wool overcoat with zero interior lining for fluid movement. Softly roped shoulders, notched lapel, deep horn-buttoned pockets, and rear walking vent.',
   '100% Double-Faced Italian Virgin Wool, 620gsm', 'Tailored longline over-layer',
   '/src/assets/images/hale_overcoat_espresso_1795355190181.jpg', '/src/assets/images/hale_model_outerwear_1795355189687.jpg', '/src/assets/images/hale_dummy_overcoat_espresso_1795356737453.jpg',
   'native', '#3D2E27', 1),
  ('hale-06', 'HL-A26-06', 6, 'Cable Knit', 'in Charcoal', 'Knitwear', 195.00,
   'Knitted on 5-gauge whole-garment frames in Hawick from extra-fine Scottish merino wool. Traditional diamond and honeycomb cable reliefs retain warmth without bulk.',
   '100% Scottish Extra-Fine Merino Wool', 'Classic saddle-shoulder fit',
   '/src/assets/images/hale_cable_charcoal_1795355190325.jpg', '/src/assets/images/hale_coast_moment_1795355189749.jpg', '/src/assets/images/hale_dummy_cable_charcoal_1795356737882.jpg',
   'native', '#3A3B3D', 1),
  ('hale-07', 'HL-A26-07', 7, 'Shirt Jacket', 'in Navy', 'Outerwear', 225.00,
   'Crisp high-twist wool-gabardine cut cleanly with a concealed button placket and single welt breast pocket. Water-repellent finish resists light Atlantic drizzle from desk to street.',
   '100% High-Twist Wool Gabardine, 340gsm', 'Clean tailored boxy cut',
   '/src/assets/images/hale_shirtjacket_navy_1795355190011.jpg', '/src/assets/images/hale_workshop_table_1795355192431.jpg', '/src/assets/images/hale_dummy_shirtjacket_navy_1795356737826.jpg',
   'native', '#1F2A3C', 1),
  ('hale-08', 'HL-A26-08', 8, 'Bomber', 'in Umber', 'Outerwear', 280.00,
   'Minimalist blouson in matte Japanese cupro-nylon with subtle sheen and peach-skin handfeel. Two-way brushed gunmetal zipper, cotton-ribbed trims, and cupro twill lining.',
   '62% Cupro, 38% Japanese Nylon Twill', 'Cropped blouson silhouette',
   '/src/assets/images/hale_bomber_umber_1795355190041.jpg', '/src/assets/images/hale_banner_morning_1795355190035.jpg', '/src/assets/images/hale_dummy_bomber_umber_1795356738286.jpg',
   'native', '#633728', 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `price` = VALUES(`price`), `model_image` = VALUES(`model_image`), `model_overlay_mode` = VALUES(`model_overlay_mode`);

-- Seed Inventory Matrix
INSERT INTO `product_inventory` (`product_id`, `size`, `stock_qty`) VALUES
  ('hale-01', 'XS', 4), ('hale-01', 'S', 8), ('hale-01', 'M', 11), ('hale-01', 'L', 7), ('hale-01', 'XL', 3),
  ('hale-02', 'XS', 3), ('hale-02', 'S', 6), ('hale-02', 'M', 9), ('hale-02', 'L', 5), ('hale-02', 'XL', 2),
  ('hale-03', 'XS', 5), ('hale-03', 'S', 9), ('hale-03', 'M', 12), ('hale-03', 'L', 8), ('hale-03', 'XL', 4),
  ('hale-04', 'XS', 2), ('hale-04', 'S', 5), ('hale-04', 'M', 6), ('hale-04', 'L', 4), ('hale-04', 'XL', 2),
  ('hale-05', 'XS', 1), ('hale-05', 'S', 3), ('hale-05', 'M', 4), ('hale-05', 'L', 3), ('hale-05', 'XL', 1),
  ('hale-06', 'XS', 3), ('hale-06', 'S', 7), ('hale-06', 'M', 8), ('hale-06', 'L', 6), ('hale-06', 'XL', 3),
  ('hale-07', 'XS', 2), ('hale-07', 'S', 5), ('hale-07', 'M', 7), ('hale-07', 'L', 5), ('hale-07', 'XL', 2),
  ('hale-08', 'XS', 2), ('hale-08', 'S', 4), ('hale-08', 'M', 5), ('hale-08', 'L', 4), ('hale-08', 'XL', 2)
ON DUPLICATE KEY UPDATE `stock_qty` = VALUES(`stock_qty`);
