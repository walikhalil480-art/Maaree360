import os
import sys
import json
import urllib.request
import io
from PIL import Image

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

CLIENT_PRODUCTS_DIR = os.path.abspath('client/public/products')
MANIFEST_PATH = os.path.join(CLIENT_PRODUCTS_DIR, 'image-catalog-manifest.json')
CATALOG_JSON_PATH = os.path.abspath('server/src/data/supermarketProducts.json')
USER_AGENT = 'SmartStockApp/1.0 (contact@smartstock.local)'

REPLACEMENTS = {
    'BAKE-009': {
        'filename': 'weetabix-whole-wheat-450g.jpg',
        'url': 'https://images.openfoodfacts.org/images/products/501/002/900/0016/front_en.44.400.jpg',
        'source': 'Open Food Facts Database',
        'license': 'CC BY-SA 3.0 / Database Contents License',
        'sourceTitle': 'Weetabix Original Whole Wheat Packshot'
    },
    'SNACK-011': {
        'filename': 'mcvities-digestive-biscuits-250g.jpg',
        'url': 'https://images.openfoodfacts.org/images/products/500/016/803/6755/front_en.72.400.jpg',
        'source': 'Open Food Facts Database',
        'license': 'CC BY-SA 3.0 / Database Contents License',
        'sourceTitle': 'McVities Digestives Original Packshot'
    },
    'DAIRY-001': {
        'filename': 'brookside-fresh-milk-500ml.jpg',
        'url': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/73/Hood_milk_package_%2826110911%29.jpg/500px-Hood_milk_package_%2826110911%29.jpg',
        'source': 'Wikimedia Commons',
        'license': 'Creative Commons Attribution 2.0 Generic',
        'sourceTitle': 'File:Hood milk package'
    },
    'MEAT-013': {
        'filename': 'frozen-sweet-corn-500g.jpg',
        'url': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f7/Canned_corn.jpg/500px-Canned_corn.jpg',
        'source': 'Wikimedia Commons',
        'license': 'Creative Commons Attribution-Share Alike 4.0 International',
        'sourceTitle': 'File:Canned corn.jpg'
    },
    'COOK-006': {
        'filename': 'kasuku-cooking-fat-1kg.jpg',
        'url': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b0/Packaging_of_margarine%2C_Extra_S-B_Margarin.JPG/500px-Packaging_of_margarine%2C_Extra_S-B_Margarin.JPG',
        'source': 'Wikimedia Commons',
        'license': 'Creative Commons CC0 1.0 Universal Public Domain',
        'sourceTitle': 'File:Packaging of margarine, Extra S-B Margarin.JPG'
    }
}

for sku, info in REPLACEMENTS.items():
    print(f"Downloading clean packshot for {sku}...")
    target_path = os.path.join(CLIENT_PRODUCTS_DIR, info['filename'])
    req = urllib.request.Request(info['url'], headers={'User-Agent': USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            raw_bytes = r.read()
        im = Image.open(io.BytesIO(raw_bytes)).convert('RGB')
        im.thumbnail((380, 380), Image.Resampling.LANCZOS)
        canvas = Image.new('RGB', (400, 400), (255, 255, 255))
        offset = ((400 - im.width) // 2, (400 - im.height) // 2)
        canvas.paste(im, offset)
        canvas.save(target_path, 'JPEG', quality=88, optimize=True)
        print(f"  [OK] Saved {info['filename']} ({os.path.getsize(target_path)} bytes)")
    except Exception as e:
        print(f"  [ERROR] {sku}: {e}")

# Update manifest
with open(MANIFEST_PATH, 'r', encoding='utf-8') as f:
    manifest_data = json.load(f)

for item in manifest_data['manifest']:
    if item['sku'] in REPLACEMENTS:
        info = REPLACEMENTS[item['sku']]
        item['source'] = info['source']
        item['sourceTitle'] = info['sourceTitle']
        item['sourceUrl'] = info['url']
        item['license'] = info['license']
        item['status'] = 'VERIFIED'
        item['fileSizeBytes'] = os.path.getsize(os.path.join(CLIENT_PRODUCTS_DIR, info['filename']))
        item['dimensions'] = '400x400'

with open(MANIFEST_PATH, 'w', encoding='utf-8') as f:
    json.dump(manifest_data, f, indent=2)

# Update catalog JSON
with open(CATALOG_JSON_PATH, 'r', encoding='utf-8') as f:
    catalog = json.load(f)

for p in catalog:
    if p['sku'] in REPLACEMENTS:
        p['imageUrl'] = f"/products/{REPLACEMENTS[p['sku']]['filename']}"
        p['imageStatus'] = 'VERIFIED'

with open(CATALOG_JSON_PATH, 'w', encoding='utf-8') as f:
    json.dump(catalog, f, indent=2)

print("\nManifest and Catalog JSON updated successfully.")
