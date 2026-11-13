async function getCarrefourImage(productId: string) {
  try {
    const url = `https://www.carrefour.ke/mafken/en/p/${productId}`
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })
    const html = await res.text()
    const matches = html.match(/https:\/\/cdn\.mafrservices\.com\/pim-content\/KEN\/media\/product\/[^\s"']+/g)
    if (matches && matches.length > 0) {
      const cleanUrl = matches[0].replace(/&quot;.*/, '').replace(/".*/, '')
      console.log(`[SUCCESS] Product ${productId} -> ${cleanUrl}`)
      return cleanUrl
    } else {
      console.log(`[NO_MATCH] Product ${productId}`)
    }
  } catch (e: any) {
    console.error(`[ERROR] Product ${productId}:`, e.message)
  }
  return null
}

async function main() {
  await getCarrefourImage('114719') // Kenzy Tomato Paste
}

main()
