async function run() {
  const csrfRes = await fetch('http://localhost:5001/api/v1/auth/csrf')
  const csrfCookie = csrfRes.headers.get('set-cookie')
  const { csrfToken } = await csrfRes.json()
  const xsrfMatch = csrfCookie.match(/XSRF-TOKEN=([^;]+)/)
  const xsrfToken = xsrfMatch ? xsrfMatch[1] : csrfToken

  const loginRes = await fetch('http://localhost:5001/api/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: csrfCookie,
      'x-csrf-token': xsrfToken,
    },
    body: JSON.stringify({ email: 'owner@maaree360.com', password: 'Maaree360@Admin2026!' }),
  })
  console.log('Login Status:', loginRes.status)
  const loginCookies = loginRes.headers.get('set-cookie')
  const sessionCookie = loginCookies
    .split(',')
    .find((c) => c.includes('smartstock_session'))
    .split(';')[0]
  const combinedCookies = csrfCookie.split(';')[0] + '; ' + sessionCookie

  const headers = {
    Cookie: combinedCookies,
    'x-csrf-token': xsrfToken,
  }

  const [overview, businesses, tenantUsers] = await Promise.all([
    fetch('http://localhost:5001/api/v1/platform/overview', { headers }).then((r) => r.json()),
    fetch('http://localhost:5001/api/v1/platform/businesses', { headers }).then((r) => r.json()),
    fetch('http://localhost:5001/api/v1/platform/tenant-users', { headers }).then((r) => r.json()),
  ])

  console.log('--- 1. PLATFORM OVERVIEW ---')
  console.log(JSON.stringify(overview.data.metrics, null, 2))
  console.log('Plan distribution:', overview.data.planDistribution)

  console.log('\n--- 2. BUSINESSES DIRECTORY (Count: ' + businesses.businesses.length + ') ---')
  for (const b of businesses.businesses) {
    console.log(`• ${b.name} (${b.status}) - Owner: ${b.owner?.name} <${b.owner?.email}> - Products: ${b.counts.products} - Users: ${b.counts.users} - Sales: ${b.counts.sales}`)
  }

  console.log('\n--- 3. TENANT USERS DIRECTORY (Count: ' + tenantUsers.users.length + ') ---')
  for (const u of tenantUsers.users) {
    console.log(`• ${u.name} <${u.email}> (Platform Admin: ${u.isPlatformAdmin}) - Stores: ${u.memberships.map((m) => m.businessName + ' [' + m.role + ']').join(', ')}`)
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
