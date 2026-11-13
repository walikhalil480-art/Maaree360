import { prisma } from '../db/prisma.js'
import { productCodeService } from '../services/productCode.service.js'
import { StockMovementType, PurchaseOrderStatus, Prisma } from '@prisma/client'

export async function verifyDemoData() {
  console.log('=================================================================')
  console.log('SmartStock Demo Data Verification Suite')
  console.log('=================================================================\n')

  const business = await prisma.business.findFirst({
    where: { name: 'SmartStock Demo Mini-Mart' },
  })

  if (!business) {
    throw new Error('Business "SmartStock Demo Mini-Mart" not found!')
  }

  const businessId = business.id
  console.log(`Checking Business: ${business.name} (${businessId})`)

  let failedChecks = 0

  function pass(title: string, details?: string) {
    console.log(`✓ PASS: ${title}${details ? ` (${details})` : ''}`)
  }

  function fail(title: string, error: string) {
    console.error(`✗ FAIL: ${title} — ${error}`)
    failedChecks++
  }

  // 1. Exactly 20 distinct products
  const products = await prisma.product.findMany({
    where: { businessId },
    include: {
      category: true,
      stockLevel: true,
      codes: true,
      stockMovements: true,
    },
    orderBy: { sku: 'asc' },
  })

  if (products.length === 20) {
    pass('Exactly 20 distinct demo products exist', `${products.length} products`)
  } else {
    fail('Product count check', `Expected exactly 20 products, found ${products.length}`)
  }

  // 2. Every product has a unique SKU
  const skus = products.map((p) => p.sku)
  const uniqueSkus = new Set(skus)
  if (uniqueSkus.size === products.length) {
    pass('SKU Uniqueness', `All ${uniqueSkus.size} SKUs are strictly unique`)
  } else {
    fail('SKU Uniqueness', `Duplicate SKUs detected! Found ${uniqueSkus.size} unique of ${products.length}`)
  }

  // 3. Every product has a valid category
  const productsWithoutCategory = products.filter((p) => !p.category)
  if (productsWithoutCategory.length === 0) {
    pass('Category Associations', 'Every product references a valid category in the business')
  } else {
    fail(
      'Category Associations',
      `${productsWithoutCategory.length} products missing category: ${productsWithoutCategory.map((p) => p.name).join(', ')}`
    )
  }

  // 4. Valid prices and minimum stock thresholds
  let invalidPricingCount = 0
  for (const p of products) {
    const cost = Number(p.costPrice)
    const selling = Number(p.sellingPrice)
    if (cost <= 0 || selling <= 0 || selling <= cost || p.minStockThreshold <= 0) {
      invalidPricingCount++
    }
  }
  if (invalidPricingCount === 0) {
    pass('Pricing & Threshold Integrity', 'All products have positive cost/selling prices, selling > cost, and valid min thresholds')
  } else {
    fail('Pricing & Threshold Integrity', `${invalidPricingCount} products have invalid pricing or thresholds`)
  }

  // 5. Stock balances agree with the stock movements ledger
  let ledgerMismatches = 0
  for (const p of products) {
    const balanceFromLevel = Number(p.stockLevel?.quantity ?? 0)

    // Calculate sum of all quantity changes from stock movements
    let computedBalance = 0
    for (const m of p.stockMovements) {
      computedBalance += Number(m.quantityChange)
    }

    if (Math.abs(balanceFromLevel - computedBalance) > 0.0001) {
      ledgerMismatches++
      console.error(
        `Ledger mismatch for SKU ${p.sku} (${p.name}): StockLevel = ${balanceFromLevel}, Ledger Sum = ${computedBalance}`
      )
    }
  }

  if (ledgerMismatches === 0) {
    pass('Inventory Ledger Reconciliation', 'All 20 product stock balances perfectly match the sum of stock movements')
  } else {
    fail('Inventory Ledger Reconciliation', `${ledgerMismatches} products have balance mismatches with the ledger`)
  }

  // 6. Opening stock movements are not duplicated
  const duplicateOpenings = products.filter(
    (p) => p.stockMovements.filter((m) => m.type === StockMovementType.OPENING_STOCK).length > 1
  )
  if (duplicateOpenings.length === 0) {
    pass('Opening Stock Non-duplication', 'No product has duplicate OPENING_STOCK records')
  } else {
    fail('Opening Stock Non-duplication', `${duplicateOpenings.length} products have multiple opening stock movements`)
  }

  // 7. Product codes resolve correctly
  let codeResolveFailures = 0
  for (const p of products) {
    for (const codeObj of p.codes) {
      try {
        const resolved = await productCodeService.resolveCode(businessId, codeObj.code)
        if (resolved.product.id !== p.id) {
          codeResolveFailures++
          console.error(`Code ${codeObj.code} resolved to wrong product: ${resolved.product.name} instead of ${p.name}`)
        }
      } catch (err) {
        codeResolveFailures++
        console.error(`Failed to resolve code ${codeObj.code}:`, err)
      }
    }
  }
  if (codeResolveFailures === 0) {
    pass('Product Code & Scanner Resolution', 'All assigned product barcodes resolve accurately to their products')
  } else {
    fail('Product Code & Scanner Resolution', `${codeResolveFailures} codes failed to resolve`)
  }

  // 8. Low-stock & Out-of-stock verification
  const lowStock = products.filter((p) => {
    const qty = Number(p.stockLevel?.quantity ?? 0)
    return qty > 0 && qty <= p.minStockThreshold
  })
  const outOfStock = products.filter((p) => Number(p.stockLevel?.quantity ?? 0) === 0)
  const healthyStock = products.filter((p) => Number(p.stockLevel?.quantity ?? 0) > p.minStockThreshold)

  console.log(`\nStock breakdown:`)
  console.log(`- Healthy stock items: ${healthyStock.length}`)
  console.log(`- Low-stock alert items: ${lowStock.length} (at or below reorder threshold)`)
  console.log(`- Out-of-stock items: ${outOfStock.length} (zero balance)`)

  if (lowStock.length >= 3 && outOfStock.length >= 2) {
    pass('Stock Variance Distribution', `Includes healthy (${healthyStock.length}), low-stock (${lowStock.length}), and out-of-stock (${outOfStock.length})`)
  } else {
    fail('Stock Variance Distribution', 'Expected at least 3 low-stock and 2 out-of-stock items for demo variety')
  }

  // 9. Suppliers and Purchase Orders
  const suppliers = await prisma.supplier.findMany({ where: { businessId } })
  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where: { businessId },
    include: { items: true, receipts: true },
  })

  if (suppliers.length === 3) {
    pass('Demo Suppliers', `3 fictional Kenyan suppliers configured`)
  } else {
    fail('Demo Suppliers', `Expected 3 suppliers, found ${suppliers.length}`)
  }

  const statuses = purchaseOrders.map((po) => po.status)
  const hasDraft = statuses.includes(PurchaseOrderStatus.DRAFT)
  const hasOrdered = statuses.includes(PurchaseOrderStatus.ORDERED)
  const hasPartiallyReceived = statuses.includes(PurchaseOrderStatus.PARTIALLY_RECEIVED)

  if (hasDraft && hasOrdered && hasPartiallyReceived) {
    pass('Purchase Order Workflow States', 'Found DRAFT, ORDERED, and PARTIALLY_RECEIVED demonstration orders')
  } else {
    fail('Purchase Order Workflow States', `Missing PO workflow states. Present statuses: ${statuses.join(', ')}`)
  }

  // Check receipts and ledger for partially received order
  const partialPO = purchaseOrders.find((po) => po.status === PurchaseOrderStatus.PARTIALLY_RECEIVED)
  if (partialPO) {
    if (partialPO.receipts.length > 0) {
      pass('Partial Delivery GRN', `Found ${partialPO.receipts.length} recorded receipt note(s) for ${partialPO.orderNumber}`)
    } else {
      fail('Partial Delivery GRN', 'PARTIALLY_RECEIVED PO has no recorded receipts')
    }
  }

  // 10. Existing unrelated records preserved
  const otherBusiness = await prisma.business.findFirst({
    where: { name: 'Khalil Academy' },
    include: { products: true, sales: true },
  })
  if (otherBusiness) {
    if (otherBusiness.products.length === 2 && otherBusiness.sales.length === 1) {
      pass('Multi-Tenant Isolation', 'Existing "Khalil Academy" products and sales remain completely untouched')
    } else {
      fail('Multi-Tenant Isolation', '"Khalil Academy" data was unexpectedly altered')
    }
  }

  console.log('\n=================================================================')
  if (failedChecks === 0) {
    console.log('ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!')
  } else {
    console.error(`VERIFICATION FAILED WITH ${failedChecks} ERRORS.`)
  }
  console.log('=================================================================\n')

  return failedChecks === 0
}

// Direct execution guard
if (process.argv[1]?.endsWith('verifyDemoData.ts')) {
  verifyDemoData()
    .then((success) => {
      if (!success) process.exit(1)
    })
    .catch((err) => {
      console.error('Verification crashed:', err)
      process.exit(1)
    })
    .finally(() => prisma.$disconnect())
}
