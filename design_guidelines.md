{
  "brand": {
    "name": "KedaiOps",
    "tagline": "POS + Stok otomatis berbasis resep",
    "attributes": [
      "cepat (kasir-first)",
      "hangat & ramah (coffee vibe)",
      "tepercaya (owner butuh angka jelas)",
      "tahan banting (offline-first)"
    ],
    "visual_style": {
      "fusion": [
        "Layout: split-screen POS ala tablet cashier (grid menu + cart sidebar)",
        "Typography: tech-startup sans untuk keterbacaan + display font halus untuk heading",
        "Surface: soft-neutral + subtle grain (bukan gradient berat)",
        "Accents: caramel/teal sebagai sinyal aksi & status"
      ],
      "do_not": [
        "Jangan pakai layout serba center.",
        "Jangan pakai gradient gelap/saturated (lihat aturan gradient).",
        "Jangan pakai purple untuk app POS/AI (tidak relevan di sini juga)."
      ]
    }
  },
  "design_tokens": {
    "fonts": {
      "google_fonts_import": "@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');",
      "font_family": {
        "display": "Space Grotesk, ui-sans-serif, system-ui",
        "body": "IBM Plex Sans, ui-sans-serif, system-ui",
        "mono": "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
      },
      "usage": {
        "headings": "display",
        "body": "body",
        "numbers": "body (tabular-nums via Tailwind class 'tabular-nums')",
        "sku_codes": "mono"
      }
    },
    "typography_scale": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight",
      "h2": "text-base md:text-lg font-medium text-muted-foreground",
      "section_title": "text-lg md:text-xl font-semibold",
      "card_kpi": "text-2xl md:text-3xl font-semibold tabular-nums",
      "body": "text-sm md:text-base",
      "small": "text-xs md:text-sm text-muted-foreground"
    },
    "color_system_hsl": {
      "note": "Gunakan HSL tokens shadcn (index.css). Update :root agar terasa coffee-warm + status jelas.",
      "light": {
        "background": "36 33% 98%",
        "foreground": "24 18% 12%",
        "card": "0 0% 100%",
        "card-foreground": "24 18% 12%",
        "popover": "0 0% 100%",
        "popover-foreground": "24 18% 12%",
        "primary": "22 45% 22%",
        "primary-foreground": "36 33% 98%",
        "secondary": "32 28% 94%",
        "secondary-foreground": "24 18% 12%",
        "muted": "32 22% 93%",
        "muted-foreground": "24 10% 40%",
        "accent": "174 45% 34%",
        "accent-foreground": "0 0% 100%",
        "destructive": "0 72% 52%",
        "destructive-foreground": "0 0% 100%",
        "border": "28 18% 86%",
        "input": "28 18% 86%",
        "ring": "174 45% 34%",
        "chart-1": "22 55% 45%",
        "chart-2": "174 45% 34%",
        "chart-3": "38 70% 55%",
        "chart-4": "12 65% 55%",
        "chart-5": "210 35% 45%"
      },
      "dark_optional": {
        "note": "Dark mode opsional untuk shift malam. Jangan pakai gradient gelap.",
        "background": "24 18% 8%",
        "foreground": "36 33% 96%",
        "card": "24 18% 10%",
        "card-foreground": "36 33% 96%",
        "primary": "38 70% 55%",
        "primary-foreground": "24 18% 10%",
        "accent": "174 45% 40%",
        "accent-foreground": "24 18% 10%",
        "border": "24 12% 18%",
        "ring": "38 70% 55%"
      },
      "semantic": {
        "success": {
          "bg": "142 52% 92%",
          "fg": "142 45% 22%",
          "border": "142 35% 80%"
        },
        "warning": {
          "bg": "38 90% 92%",
          "fg": "28 70% 22%",
          "border": "38 55% 80%"
        },
        "danger": {
          "bg": "0 85% 94%",
          "fg": "0 65% 30%",
          "border": "0 55% 84%"
        },
        "info": {
          "bg": "210 70% 94%",
          "fg": "210 55% 28%",
          "border": "210 45% 84%"
        }
      }
    },
    "radius_shadow_spacing": {
      "radius": {
        "sm": "0.5rem",
        "md": "0.75rem",
        "lg": "1rem",
        "xl": "1.25rem"
      },
      "shadows": {
        "soft": "0 10px 30px rgba(24, 18, 12, 0.08)",
        "lift": "0 14px 40px rgba(24, 18, 12, 0.12)",
        "inset": "inset 0 1px 0 rgba(255,255,255,0.6)"
      },
      "spacing_rule": "Gunakan whitespace besar: section py-6 md:py-10, gap-4 md:gap-6, card p-4 md:p-6. Tap target min-h-11 (44px)."
    },
    "texture_gradient": {
      "noise_overlay_css": "background-image: radial-gradient(rgba(0,0,0,0.035) 1px, transparent 1px); background-size: 3px 3px;",
      "allowed_gradients": [
        "Hero header only (max 20% viewport): from cream -> sand -> cream (very mild)",
        "Decorative strip behind page title: linear-gradient(90deg, rgba(212,165,116,0.18), rgba(46,164,154,0.10), rgba(255,248,240,0))"
      ]
    }
  },
  "layout": {
    "global_shell": {
      "pattern": "App Shell 3-zone",
      "zones": [
        "Left: sidebar nav (collapsible on mobile)",
        "Top: header bar (store switcher, sync status, user menu)",
        "Main: content area with page-specific layouts"
      ],
      "grid": {
        "desktop": "lg:grid lg:grid-cols-[260px_1fr]",
        "tablet": "md:grid md:grid-cols-[220px_1fr]",
        "mobile": "single column + bottom nav optional"
      }
    },
    "pos_layout": {
      "goal": "Kasir super cepat saat antri",
      "structure": {
        "left_panel": "Menu grid + kategori + search",
        "right_panel": "Keranjang (cart) sticky + pembayaran",
        "bottom_bar_mobile": "Total + tombol Bayar (sticky)"
      },
      "recommended_split": {
        "tablet_landscape": "grid 7/12 (menu) + 5/12 (cart)",
        "desktop": "grid 8/12 + 4/12"
      },
      "menu_grid": {
        "card_size": "min-h-[92px] md:min-h-[110px]",
        "columns": "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
        "category_chips": "horizontal ScrollArea"
      }
    },
    "dashboard_layout": {
      "pattern": "Bento KPI + charts + tables",
      "kpi_row": "grid grid-cols-2 lg:grid-cols-4 gap-4",
      "charts_row": "grid grid-cols-1 lg:grid-cols-3 gap-4",
      "tables": "Card + Table with sticky header + filters"
    }
  },
  "components": {
    "component_path": {
      "shadcn_primary": "/app/frontend/src/components/ui/",
      "use_components": [
        "button.jsx",
        "card.jsx",
        "badge.jsx",
        "tabs.jsx",
        "table.jsx",
        "dialog.jsx",
        "drawer.jsx",
        "sheet.jsx",
        "select.jsx",
        "input.jsx",
        "textarea.jsx",
        "calendar.jsx",
        "popover.jsx",
        "dropdown-menu.jsx",
        "scroll-area.jsx",
        "separator.jsx",
        "tooltip.jsx",
        "sonner.jsx",
        "skeleton.jsx",
        "progress.jsx",
        "switch.jsx",
        "checkbox.jsx"
      ]
    },
    "page_blueprints": {
      "POS": {
        "key_components": [
          "Tabs (kategori)",
          "Input (search)",
          "Card (menu item)",
          "Badge (stok/label)",
          "Table (cart lines) atau list",
          "Dialog/Drawer (edit item, diskon, catatan)",
          "Sheet (shortcut help)",
          "Sonner toast (aksi cepat)"
        ],
        "critical_interactions": [
          "Tap menu card => add qty +1 (toast kecil: 'Americano +1')",
          "Long-press / kebab menu => edit qty, catatan, hapus",
          "Checkout => Dialog konfirmasi + metode bayar",
          "Offline => banner kecil + queue counter"
        ],
        "data_testids": [
          "pos-search-input",
          "pos-category-tabs",
          "pos-menu-item-card",
          "pos-cart-panel",
          "pos-checkout-button",
          "pos-payment-method-select",
          "pos-confirm-payment-button",
          "pos-sync-status-indicator"
        ]
      },
      "Menu Management": {
        "layout": "Table + right Drawer for create/edit",
        "key_components": [
          "Table (menu list)",
          "Drawer (form)",
          "Select (kategori)",
          "Dialog (delete confirm)",
          "Accordion (recipe breakdown per ingredient)",
          "Input (harga, nama)",
          "Badge (aktif/nonaktif)"
        ],
        "recipe_editor": {
          "pattern": "Inline rows: ingredient select + qty + unit",
          "empty_state": "Card with illustration + CTA 'Tambah resep'"
        },
        "data_testids": [
          "menu-list-table",
          "menu-create-button",
          "menu-edit-drawer",
          "menu-recipe-row",
          "menu-save-button"
        ]
      },
      "Ingredients/Stock": {
        "layout": "KPI strip + Table + filters",
        "key_components": [
          "Card (KPI: total bahan, low stock)",
          "Table (ingredients)",
          "Badge (status)",
          "Progress (stok vs threshold)",
          "Dialog (adjust stock)",
          "Calendar + Popover (filter tanggal masuk/keluar)"
        ],
        "low_stock_pattern": {
          "visual": "Row highlight subtle (bg-warning/20) + badge 'Menipis'",
          "action": "Button 'Restock' opens Drawer"
        },
        "data_testids": [
          "ingredients-table",
          "ingredients-search-input",
          "ingredient-adjust-stock-button",
          "ingredient-low-stock-badge"
        ]
      },
      "Sales History": {
        "layout": "Filters top + Table + detail Dialog",
        "key_components": [
          "Calendar range filter",
          "Select (kasir, metode bayar)",
          "Table (transactions)",
          "Dialog (receipt preview)",
          "Pagination"
        ],
        "data_testids": [
          "sales-history-table",
          "sales-date-filter",
          "sales-transaction-row",
          "sales-receipt-preview-dialog"
        ]
      },
      "Reports Dashboard": {
        "charts": {
          "library": "recharts",
          "charts_to_use": [
            "LineChart (tren penjualan)",
            "BarChart (top menu)",
            "AreaChart (pemakaian bahan)"
          ],
          "empty_state": "Skeleton + message 'Belum ada data di rentang ini'"
        },
        "data_testids": [
          "reports-kpi-total-sales",
          "reports-chart-sales-trend",
          "reports-chart-top-menu",
          "reports-date-range"
        ]
      },
      "Settings": {
        "layout": "Two-column form on desktop, single on mobile",
        "key_components": [
          "Tabs (Toko, Printer, Sinkronisasi, User)",
          "Form",
          "Switch",
          "Select",
          "Dialog (add user)",
          "Table (users)",
          "Badge (role)"
        ],
        "data_testids": [
          "settings-tabs",
          "settings-store-name-input",
          "settings-printer-test-button",
          "settings-sync-now-button",
          "settings-add-user-button"
        ]
      }
    },
    "buttons": {
      "style": "Professional-warm (radius 10-12px, solid fills, subtle shadow)",
      "variants": {
        "primary": "bg-primary text-primary-foreground hover:brightness-[0.98] active:scale-[0.98]",
        "secondary": "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        "ghost": "hover:bg-accent/10 text-foreground",
        "danger": "bg-destructive text-destructive-foreground hover:brightness-[0.98]"
      },
      "sizes": {
        "sm": "h-9 px-3 text-sm",
        "md": "h-11 px-4 text-sm md:text-base",
        "lg": "h-12 px-5 text-base"
      },
      "focus": "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    },
    "badges": {
      "status_badges": {
        "in_stock": "bg-[hsl(var(--success-bg))] text-[hsl(var(--success-fg))] border border-[hsl(var(--success-border))]",
        "low_stock": "bg-[hsl(var(--warning-bg))] text-[hsl(var(--warning-fg))] border border-[hsl(var(--warning-border))]",
        "out_stock": "bg-[hsl(var(--danger-bg))] text-[hsl(var(--danger-fg))] border border-[hsl(var(--danger-border))]"
      }
    }
  },
  "motion_microinteractions": {
    "principles": [
      "Kasir flow: animasi harus cepat (120–180ms) dan tidak mengganggu.",
      "Gunakan easing 'ease-out' untuk masuk, 'ease-in' untuk keluar.",
      "Hindari animasi besar pada area tabel (bisa bikin pusing saat ramai)."
    ],
    "recommended_library": {
      "name": "framer-motion",
      "install": "npm i framer-motion",
      "usage": [
        "AnimatePresence untuk Drawer/Dialog content",
        "motion.div untuk menu card press feedback"
      ]
    },
    "micro_states": {
      "menu_card": {
        "hover": "shadow-lift (custom) + translate-y-[-1px]",
        "press": "scale-[0.98]",
        "added_feedback": "small pulse ring (outline) 1x"
      },
      "sync_status": {
        "online": "dot teal + subtle ping (only once on reconnect)",
        "offline": "dot amber + label 'Offline'",
        "syncing": "progress bar thin + text 'Menyinkronkan…'"
      }
    }
  },
  "offline_sync_ui": {
    "patterns": [
      "Header indicator: Online/Offline + queued changes count",
      "Non-blocking banner when offline: 'Mode offline — transaksi tetap tersimpan'",
      "Manual action: button 'Sync sekarang' in Settings + in POS cart footer"
    ],
    "states": {
      "queued": "Badge with number",
      "conflict": "Alert component with CTA 'Tinjau' opens Dialog"
    },
    "data_testids": [
      "sync-banner",
      "sync-queue-count",
      "sync-now-button",
      "sync-conflict-alert"
    ]
  },
  "receipt_printing": {
    "receipt_preview": {
      "component": "Dialog + ScrollArea",
      "layout": "Thermal 58/80mm preview card with mono font for totals",
      "actions": [
        "Cetak",
        "Kirim via WhatsApp (optional future)",
        "Simpan PDF (optional)"
      ]
    },
    "print_css_notes": [
      "Gunakan @media print untuk hide nav/header.",
      "Gunakan font mono untuk angka agar rapi.",
      "Pastikan kontras tinggi (hitam di putih)."
    ],
    "data_testids": [
      "receipt-preview",
      "receipt-print-button"
    ]
  },
  "accessibility": {
    "rules": [
      "Tap targets min 44px (h-11).",
      "Kontras teks minimal WCAG AA.",
      "Focus ring wajib terlihat (ring-ring + ring-offset).",
      "Gunakan label jelas Bahasa Indonesia (hindari jargon).",
      "Untuk warna status, selalu sertakan teks (bukan warna saja)."
    ]
  },
  "images": {
    "image_urls": [
      {
        "category": "auth_or_empty_state",
        "description": "Background/hero image untuk halaman login atau empty state dashboard (subtle, warm).",
        "url": "https://images.unsplash.com/photo-1567880905822-56f8e06fe630?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1OTV8MHwxfHNlYXJjaHwyfHxjb2ZmZWUlMjBzaG9wJTIwY291bnRlciUyMGJhcmlzdGElMjB3YXJtJTIwbWluaW1hbCUyMGludGVyaW9yfGVufDB8fHx8MTc4ODM0NjMxOXww&ixlib=rb-4.1.0&q=85"
      },
      {
        "category": "empty_state_texture",
        "description": "Foto beans untuk empty state / onboarding card kecil (gunakan sebagai thumbnail kecil saja, bukan background besar).",
        "url": "https://images.unsplash.com/photo-1447933601403-0c6688de566e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODF8MHwxfHNlYXJjaHwxfHxjb2ZmZWUlMjBiZWFucyUyMGZsYXQlMjBsYXklMjB3YXJtJTIwbmV1dHJhbHxlbnwwfHx8fDE3ODgzNDYzMjN8MA&ixlib=rb-4.1.0&q=85"
      },
      {
        "category": "product_placeholder",
        "description": "Placeholder foto minuman untuk kartu menu (jika menu belum punya foto).",
        "url": "https://images.unsplash.com/photo-1771623117490-58382d47f882?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzR8MHwxfHNlYXJjaHw0fHxjb2ZmZWUlMjBjdXAlMjBtaW5pbWFsJTIwc3R1ZGlvfGVufDB8fHx8MTc4ODM0NjMzNnww&ixlib=rb-4.1.0&q=85"
      }
    ]
  },
  "instructions_to_main_agent": {
    "css_updates": [
      "Hapus styling default CRA di App.css (App-header, App-logo). Jangan center container.",
      "Update /app/frontend/src/index.css :root tokens sesuai color_system_hsl.light dan tambahkan semantic tokens (success/warning/danger/info) sebagai CSS variables baru.",
      "Tambahkan Google Fonts import di index.css paling atas.",
      "Tambahkan utility class untuk noise overlay (misal .bg-noise) di @layer utilities."
    ],
    "tailwind_usage": [
      "Gunakan container max-w-none untuk POS (butuh full width).",
      "Gunakan sticky untuk cart panel dan bottom bar mobile.",
      "Gunakan ScrollArea untuk kategori chips dan list panjang.",
      "Gunakan data-testid di semua tombol/inputs/indikator penting (kebab-case)."
    ],
    "libraries": [
      {
        "name": "recharts",
        "install": "npm i recharts",
        "why": "Grafik laporan penjualan & pemakaian bahan"
      },
      {
        "name": "framer-motion",
        "install": "npm i framer-motion",
        "why": "Micro-interactions (press/enter/exit) tanpa terasa berat"
      }
    ],
    "iconography": {
      "library": "lucide-react",
      "note": "Jangan pakai emoji untuk ikon."
    },
    "i18n_copy": {
      "tone": "Bahasa Indonesia ringkas, operasional",
      "examples": {
        "checkout": "Bayar",
        "syncing": "Menyinkronkan…",
        "offline": "Mode offline",
        "low_stock": "Stok menipis"
      }
    }
  },
  "general_ui_ux_design_guidelines_appendix": "<General UI UX Design Guidelines>  \n    - You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms\n    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text\n   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json\n\n **GRADIENT RESTRICTION RULE**\nNEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc\nNEVER use dark gradients for logo, testimonial, footer etc\nNEVER let gradients cover more than 20% of the viewport.\nNEVER apply gradients to text-heavy content or reading areas.\nNEVER use gradients on small UI elements (<100px width).\nNEVER stack multiple gradient layers in the same viewport.\n\n**ENFORCEMENT RULE:**\n    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors\n\n**How and where to use:**\n   • Section backgrounds (not content backgrounds)\n   • Hero section header content. Eg: dark to light to dark color\n   • Decorative overlays and accent elements only\n   • Hero section with 2-3 mild color\n   • Gradients creation can be done for any angle say horizontal, vertical or diagonal\n\n- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**\n\n</Font Guidelines>\n\n- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. \n   \n- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.\n\n- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.\n   \n- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly\n    Eg: - if it implies playful/energetic, choose a colorful scheme\n           - if it implies monochrome/minimal, choose a black–white/neutral scheme\n\n**Component Reuse:**\n\t- Prioritize using pre-existing components from src/components/ui when applicable\n\t- Create new components that match the style and conventions of existing components when needed\n\t- Examine existing components to understand the project's component patterns before creating new ones\n\n**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component\n\n**Best Practices:**\n\t- Use Shadcn/UI as the primary component library for consistency and accessibility\n\t- Import path: ./components/[component-name]\n\n**Export Conventions:**\n\t- Components MUST use named exports (export const ComponentName = ...)\n\t- Pages MUST use default exports (export default function PageName() {...})\n\n**Toasts:**\n  - Use `sonner` for toasts\"\n  - Sonner component are located in `/app/src/components/ui/sonner.tsx`\n\nUse 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals.\n</General UI UX Design Guidelines>"
}
