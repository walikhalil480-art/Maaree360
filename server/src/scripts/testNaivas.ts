async function checkNaivas(query: string) {
  try {
    const res = await fetch(`https://naivas.online/search?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })
    const text = await res.text()
    const matches = text.match(/https:\/\/d16zmt6hgq1jhj\.cloudfront\.net\/product\/[^\s"']+/g)
    console.log(`Naivas [${query}]:`, matches ? matches.slice(0, 3) : 'No match')
  } catch (e: any) {
    console.error('Error:', e.message)
  }
}

async function main() {
  await checkNaivas('Santa Lucia Spaghetti 400g')
  await checkNaivas('Santa Lucia Macaroni')
  await checkNaivas('Tomato Paste 30g')
  await checkNaivas('Ndengu 1kg')
  await checkNaivas('Cooking Fat 50g')
  await checkNaivas('UHT Milk 200ml')
  await checkNaivas('Cooking Oil 500ml')
}

main()
