import os
import sys
import json
import urllib.request
from pathlib import Path

# Fix U2NET cache to local directory
os.environ["U2NET_HOME"] = str(Path(".u2net").resolve())

from rembg import remove, new_session
from PIL import Image

PRODUCTS_URL = "https://spb-t4n3zw7otj123173.supabase.opentrust.net/rest/v1/public_products?select=id,name,image_url"
HEADERS = {
    "apikey": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiIsInJlZiI6InNwYi10NG4zenc3b3RqMTIzMTczIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3OTA3MDE1MDYsImV4cCI6MjEwNjI3NzUwNn0.8SrZEn0G5lX0xXYpt_xK5xkelNKJXYk7wClSNfRFPac"
}

OUTPUT_DIR = Path("processed_products")
ORIGINALS_DIR = OUTPUT_DIR / "originals"
TRANSPARENT_DIR = OUTPUT_DIR / "transparent"

ORIGINALS_DIR.mkdir(parents=True, exist_ok=True)
TRANSPARENT_DIR.mkdir(parents=True, exist_ok=True)

def fetch_products():
    req = urllib.request.Request(PRODUCTS_URL, headers=HEADERS)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

def download_file(url, target_path):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as resp, open(target_path, "wb") as f:
        f.write(resp.read())

def sanitize_filename(name):
    clean = "".join(c if c.isalnum() or c in ("-", "_") else "_" for c in name)
    return clean.strip("_")

def main():
    print("Buscando lista de produtos...", flush=True)
    products = fetch_products()
    print(f"Total de produtos encontrados: {len(products)}", flush=True)

    print("Inicializando sessão da IA (u2net)...", flush=True)
    session = new_session("u2net")
    print("Sessão da IA pronta!", flush=True)

    report = []

    for i, prod in enumerate(products, 1):
        name = prod.get("name") or "sem_nome"
        image_url = prod.get("image_url")
        prod_id = prod.get("id")

        if not image_url:
            print(f"[{i}/{len(products)}] {name}: sem imagem", flush=True)
            continue

        safe_name = sanitize_filename(name)
        orig_file = ORIGINALS_DIR / f"{i:02d}_{safe_name}.png"
        trans_file = TRANSPARENT_DIR / f"{i:02d}_{safe_name}_sem_fundo.png"

        # Check if already processed
        if trans_file.exists():
            print(f"[{i}/{len(products)}] {name}: Já processado!", flush=True)
            report.append({
                "id": prod_id,
                "name": name,
                "original_url": image_url,
                "transparent_file": str(trans_file)
            })
            continue

        print(f"[{i}/{len(products)}] {name} - Baixando...", flush=True)
        try:
            download_file(image_url, orig_file)
        except Exception as e:
            print(f"  Erro ao baixar: {e}", flush=True)
            continue

        print(f"  -> Removendo fundo com IA...", flush=True)
        try:
            with open(orig_file, "rb") as f_in:
                inp_data = f_in.read()
                out_data = remove(inp_data, session=session)
                with open(trans_file, "wb") as f_out:
                    f_out.write(out_data)
            print(f"  -> Concluído: {trans_file.name}", flush=True)
            report.append({
                "id": prod_id,
                "name": name,
                "original_url": image_url,
                "transparent_file": str(trans_file)
            })
        except Exception as e:
            print(f"  Erro no recorte: {e}", flush=True)

    summary_file = OUTPUT_DIR / "summary.json"
    with open(summary_file, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print("\nTODOS OS PRODUTOS PROCESSADOS COM SUCESSO!", flush=True)
    print(f"Total: {len(report)} imagens recortadas salvas em: {TRANSPARENT_DIR.resolve()}", flush=True)

if __name__ == "__main__":
    main()
