import { prisma } from '../db/prisma.js'

const IMAGE_MAP: Record<string, string> = {
  'FLOUR-001': '/products/pembe-maize-flour-2kg.svg',
  'FLOUR-002': '/products/jogoo-maize-flour-2kg.svg',
  'FLOUR-003': '/products/soko-wheat-flour-2kg.svg',
  'RICE-001': '/products/mwea-pishori-rice-2kg.svg',
  'SUGAR-001': '/products/white-sugar-1kg.svg',
  'SALT-001': '/products/kensalt-iodized-salt-500g.svg',
  'OIL-001': '/products/rina-cooking-oil-1l.svg',
  'MILK-001': '/products/kcc-uht-milk-500ml.svg',
  'MILK-002': '/products/brookside-fresh-milk-1l.svg',
  'BREAD-001': '/products/supaloaf-white-bread-400g.svg',
  'EGGS-001': '/products/fresh-farm-eggs.svg',
  'SPREAD-001': '/products/blueband-margarine-250g.svg',
  'TEA-001': '/products/ketepa-tea-bags-50s.svg',
  'COFFEE-001': '/products/nescafe-instant-coffee-100g.svg',
  'WATER-001': '/products/keringet-water-1l.svg',
  'SODA-001': '/products/fanta-orange-500ml.svg',
  'CLEAN-001': '/products/ariel-washing-powder-1kg.svg',
  'CLEAN-002': '/products/sunlight-dishwashing-liquid-500ml.svg',
  'SOAP-001': '/products/geisha-bathing-soap-125g.svg',
  'DENTAL-001': '/products/colgate-toothpaste-100ml.svg',
}

const NAME_KEYWORDS: Array<{ keyword: RegExp; img: string }> = [
  { keyword: /pembe/i, img: '/products/pembe-maize-flour-2kg.svg' },
  { keyword: /jogoo/i, img: '/products/jogoo-maize-flour-2kg.svg' },
  { keyword: /soko/i, img: '/products/soko-wheat-flour-2kg.svg' },
  { keyword: /rice|pishori/i, img: '/products/mwea-pishori-rice-2kg.svg' },
  { keyword: /sugar/i, img: '/products/white-sugar-1kg.svg' },
  { keyword: /salt/i, img: '/products/kensalt-iodized-salt-500g.svg' },
  { keyword: /oil|rina/i, img: '/products/rina-cooking-oil-1l.svg' },
  { keyword: /uht|kcc/i, img: '/products/kcc-uht-milk-500ml.svg' },
  { keyword: /brookside|milk/i, img: '/products/brookside-fresh-milk-1l.svg' },
  { keyword: /bread|loaf|supaloaf/i, img: '/products/supaloaf-white-bread-400g.svg' },
  { keyword: /egg/i, img: '/products/fresh-farm-eggs.svg' },
  { keyword: /blue\s*band|margarine/i, img: '/products/blueband-margarine-250g.svg' },
  { keyword: /tea|ketepa/i, img: '/products/ketepa-tea-bags-50s.svg' },
  { keyword: /coffee|nescafe/i, img: '/products/nescafe-instant-coffee-100g.svg' },
  { keyword: /water|keringet/i, img: '/products/keringet-water-1l.svg' },
  { keyword: /soda|fanta/i, img: '/products/fanta-orange-500ml.svg' },
  { keyword: /ariel|washing\s*powder/i, img: '/products/ariel-washing-powder-1kg.svg' },
  { keyword: /dishwash|sunlight/i, img: '/products/sunlight-dishwashing-liquid-500ml.svg' },
  { keyword: /soap|geisha/i, img: '/products/geisha-bathing-soap-125g.svg' },
  { keyword: /colgate|toothpaste/i, img: '/products/colgate-toothpaste-100ml.svg' },
]

async function main() {
  const products = await prisma.product.findMany()
  console.log(`Found ${products.length} products in database.`)

  let updated = 0
  for (const product of products) {
    let targetImage = IMAGE_MAP[product.sku]
    if (!targetImage) {
      for (const rule of NAME_KEYWORDS) {
        if (rule.keyword.test(product.name)) {
          targetImage = rule.img
          break
        }
      }
    }

    if (targetImage && product.imageUrl !== targetImage) {
      await prisma.product.update({
        where: { id: product.id },
        data: { imageUrl: targetImage },
      })
      updated++
      console.log(`Updated ${product.sku} (${product.name}) -> ${targetImage}`)
    }
  }

  console.log(`Assigned images to ${updated} products.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
