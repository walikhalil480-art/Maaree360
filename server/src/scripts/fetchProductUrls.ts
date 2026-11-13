async function searchCarrefour(query: string) {
  try {
    const url = `https://www.carrefour.ke/mafken/en/search?q=${encodeURIComponent(query)}`
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml',
      },
    })
    const html = await res.text()
    
    // Look for cdn.mafrservices.com image URLs
    const matches = html.match(/https:\/\/cdn\.mafrservices\.com\/pim-content\/KEN\/media\/product\/[^\s"']+/g)
    if (matches && matches.length > 0) {
      console.log(`[SUCCESS] ${query} ->`, matches[0])
      return matches[0]
    } else {
      console.log(`[NO_MATCH] ${query}`)
    }
  } catch (err: any) {
    console.error(`[ERROR] ${query}:`, err.message)
  }
  return null
}

async function main() {
  const items = [
    'Santa Lucia Spaghetti 400g',
    'Santa Lucia Elbow Pasta',
    'Ketepa Fahari Ya Kenya Loose Tea 100g',
    'Zesta Tomato Paste',
    'Kasuku Cooking Fat',
    'Kimbo Cooking Fat',
    'KCC UHT Milk 200ml',
    'Brookside Dairy Best Long Life Milk 200ml',
    'Green Grams Ndengu 1kg',
    'Golden Fry Cooking Oil 500ml',
    'Fresh Fri Cooking Oil 500ml',
    'Rina Cooking Oil 500ml',
    'Brookside Strawberry Yoghurt 450ml',
  ]

  for (const item of items) {
    await searchCarrefour(item)
    // Small delay
    await new Promise((r) => setTimeout(r, 600))
  }
}

main()
