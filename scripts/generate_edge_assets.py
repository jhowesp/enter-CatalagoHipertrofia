import os
import json
import urllib.request
from pathlib import Path
from PIL import Image

PRODUCTS = [
  {"slug": "protein-crush-900g-under-labz", "url": "https://spb-t4n3zw7otj123173.supabase.opentrust.net/storage/v1/object/public/product-images/products/ded20c6e-7d2f-42a8-9eef-bbb8f430cc55.png"},
  {"slug": "whey-q10-450g-endogen", "url": "https://spb-t4n3zw7otj123173.supabase.opentrust.net/storage/v1/object/public/product-images/products/48aba898-9824-4326-aab4-286c2dc599cd.png"},
  {"slug": "beef-protein-900g-under-labz", "url": "https://spb-t4n3zw7otj123173.supabase.opentrust.net/storage/v1/object/public/product-images/products/8d967a19-ffa3-4ad5-99e0-8d87eee6bf4f.png"},
  {"slug": "dimethylex-termogenico-60-caps-under-labz", "url": "https://spb-t4n3zw7otj123173.supabase.opentrust.net/storage/v1/object/public/product-images/products/360d0de8-1571-41e9-bd3c-b0c675d87849.png"},
  {"slug": "fckng-booster-energy-300g-under-labz", "url": "https://spb-t4n3zw7otj123173.supabase.opentrust.net/storage/v1/object/public/product-images/products/8094ab18-739d-4f7a-bc0e-329b3b0bf321.png"},
  {"slug": "v9-pump-300g", "url": "https://spb-t4n3zw7otj123173.supabase.opentrust.net/storage/v1/object/public/product-images/products/08c04592-e116-4f3d-88f5-09b12c3b7f38.png"},
  {"slug": "osteo-repair-60-capsulas", "url": "https://spb-t4n3zw7otj123173.supabase.opentrust.net/storage/v1/object/public/product-images/products/d566398c-e7bf-446d-8a84-31a9bbbac73f.png"},
  {"slug": "beta-alanine-300g", "url": "https://spb-t4n3zw7otj123173.supabase.opentrust.net/storage/v1/object/public/product-images/products/826883fb-3217-4568-8ee8-9f424e1e9931.png"},
  {"slug": "glutamina-100-pure-300g", "url": "https://spb-t4n3zw7otj123173.supabase.opentrust.net/storage/v1/object/public/product-images/products/43987414-72dd-4276-99f4-53b0abf941a8.png"},
  {"slug": "kit-mass-gain", "url": "https://spb-t4n3zw7otj123173.supabase.opentrust.net/storage/v1/object/public/product-images/products/aea6da19-e352-4787-82ba-95f14a36dba8.png"},
  {"slug": "creatina-100-pure-500g", "url": "https://spb-t4n3zw7otj123173.supabase.opentrust.net/storage/v1/object/public/product-images/products/5353d96a-096c-41c8-b3a8-06f1dea99562.png"},
  {"slug": "colageno-verisol-em-gomas-red-berries", "url": "https://spb-t4n3zw7otj123173.supabase.opentrust.net/storage/v1/object/public/product-images/products/c70bd6e0-24b7-4ab6-8244-2a078bcf09e8.png"},
  {"slug": "doce-de-leite-400g-zero-acucar", "url": "https://spb-t4n3zw7otj123173.supabase.opentrust.net/storage/v1/object/public/product-images/products/ed6127d6-8d9e-4bd8-a3a4-740d3283bc8a.png"},
  {"slug": "warzone-night-360g", "url": "https://spb-t4n3zw7otj123173.supabase.opentrust.net/storage/v1/object/public/product-images/products/62c8998e-ecc9-426f-9e3d-a0572c27bb71.png"},
  {"slug": "albumina-1kg-uevo", "url": "https://spb-t4n3zw7otj123173.supabase.opentrust.net/storage/v1/object/public/product-images/products/61f26091-bd6c-4630-b2e1-59b2cb00fbe1.png"},
  {"slug": "creatina-100-pura-300g-endogen", "url": "https://spb-t4n3zw7otj123173.supabase.opentrust.net/storage/v1/object/public/product-images/products/9f5e52b3-62ce-48df-9ccc-77253c847adc.png"},
  {"slug": "captain-gainer-3kg-hipercalorico", "url": "https://spb-t4n3zw7otj123173.supabase.opentrust.net/storage/v1/object/public/product-images/products/864980fb-2ddf-4210-97b9-1cae65664206.png"},
  {"slug": "creatina-100-pure-300g", "url": "https://spb-t4n3zw7otj123173.supabase.opentrust.net/storage/v1/object/public/product-images/products/e2f5a1ac-6787-41fe-967c-b8999fe1bd8d.png"},
  {"slug": "creatina-100-pure-150g", "url": "https://spb-t4n3zw7otj123173.supabase.opentrust.net/storage/v1/object/public/product-images/products/0986d675-50b1-4754-9e98-5d12fc30caa2.png"},
  {"slug": "rampage-300g-under-labz", "url": "https://spb-t4n3zw7otj123173.supabase.opentrust.net/storage/v1/object/public/product-images/products/f754e3a2-57c0-45af-b1e9-2c9cd5ac973a.png"},
  {"slug": "whey-100-900g-under-labz", "url": "https://spb-t4n3zw7otj123173.supabase.opentrust.net/storage/v1/object/public/product-images/products/a83efe04-e1a8-4a22-83a2-573a01cceeb3.png"},
  {"slug": "lipo-super-hd-termogenico", "url": "https://spb-t4n3zw7otj123173.supabase.opentrust.net/storage/v1/object/public/product-images/products/194218ef-7cad-48d9-ab53-7eadbda6b789.png"},
  {"slug": "cafeina-anidra-60-capsulas", "url": "https://spb-t4n3zw7otj123173.supabase.opentrust.net/storage/v1/object/public/product-images/products/d594aa33-575f-4b53-a1ef-878dba8dc399.png"},
  {"slug": "fckng-booster-ecstasy-energy-600g", "url": "https://spb-t4n3zw7otj123173.supabase.opentrust.net/storage/v1/object/public/product-images/products/37d32f1a-964a-4f46-942e-fc213013ab6c.png"},
  {"slug": "warzone-rocket-energy-450g", "url": "https://spb-t4n3zw7otj123173.supabase.opentrust.net/storage/v1/object/public/product-images/products/404cc0da-19ae-40d1-91bc-22d91b226d43.png"},
  {"slug": "multivitaminico-under-labz", "url": "https://spb-t4n3zw7otj123173.supabase.opentrust.net/storage/v1/object/public/product-images/products/43c4b120-a330-4023-ae92-739ac9ce8a91.png"},
  {"slug": "tribulus-alphagenin", "url": "https://spb-t4n3zw7otj123173.supabase.opentrust.net/storage/v1/object/public/product-images/products/705054ca-ae0e-44d3-adbd-56fee1520972.png"}
]

BANNER_URL = "https://spb-t4n3zw7otj123173.supabase.opentrust.net/storage/v1/object/public/banner-images/banners/785e91c9-7d55-48b9-b967-45a42f9245c9.png"

PROD_DIR = Path("public/catalog-images/products")
BANNER_DIR = Path("public/catalog-images/banners")

PROD_DIR.mkdir(parents=True, exist_ok=True)
BANNER_DIR.mkdir(parents=True, exist_ok=True)

def download(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as resp, open(dest, "wb") as f:
        f.write(resp.read())

def optimize_product(slug, url):
    dest = PROD_DIR / f"{slug}.webp"
    temp = Path(f"temp_{slug}.png")
    try:
        download(url, temp)
        im = Image.open(temp)
        # Resize to max 500x500
        im.thumbnail((500, 500), Image.Resampling.LANCZOS)
        im.save(dest, "WEBP", quality=82, method=6)
        size = dest.stat().st_size
        print(f"[PROD] {slug} -> {size/1024:.1f} KB", flush=True)
    finally:
        if temp.exists():
            temp.unlink()

def optimize_banner():
    temp = Path("temp_banner.png")
    try:
        download(BANNER_URL, temp)
        im = Image.open(temp)
        
        # Desktop version (1440 max width)
        im_desk = im.copy()
        im_desk.thumbnail((1440, 1440), Image.Resampling.LANCZOS)
        dest_desk = BANNER_DIR / "lipo-super-hd.webp"
        im_desk.save(dest_desk, "WEBP", quality=80, method=6)
        print(f"[BANNER DESKTOP] -> {dest_desk.stat().st_size/1024:.1f} KB", flush=True)

        # Mobile version (720 max width)
        im_mob = im.copy()
        im_mob.thumbnail((720, 720), Image.Resampling.LANCZOS)
        dest_mob = BANNER_DIR / "lipo-super-hd-mobile.webp"
        im_mob.save(dest_mob, "WEBP", quality=78, method=6)
        print(f"[BANNER MOBILE] -> {dest_mob.stat().st_size/1024:.1f} KB", flush=True)
    finally:
        if temp.exists():
            temp.unlink()

print("Iniciando otimização local de produtos e banners...", flush=True)
optimize_banner()
for p in PRODUCTS:
    optimize_product(p["slug"], p["url"])

total_bytes = sum(f.stat().st_size for f in PROD_DIR.glob("*.webp")) + sum(f.stat().st_size for f in BANNER_DIR.glob("*.webp"))
print(f"\nCONCLUÍDO! Tamanho total de todas as 28 imagens somadas: {total_bytes/1024:.1f} KB!", flush=True)
