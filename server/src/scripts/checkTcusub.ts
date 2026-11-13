import { prisma } from '../db/prisma.js'
import { verifyPassword } from '../utils/password.js'

async function check() {
  const user = await prisma.user.findUnique({ where: { email: 'tcusub777@gmail.com' } })
  if (!user) return

  const wordlist = [
    'tcusub777', 'tcusub123', 'tcusub', 'Tcusub777', 'Tcusub123', 'Tcusub', 'Tcusub@777', 'Tcusub777!',
    'Tijabo123', 'Tijabo777', 'tijabo123', 'tijabo777', 'tijabo', 'Tijabo', 'TijaboCusub', 'tijabocusub',
    'TijaboCusub123', 'Tijabo@123', 'Tijabo@777', 'Cusub123', 'cusub123', 'Cusub777', 'cusub777',
    'Password123', 'Password123!', 'password123', 'Password1234', 'password', 'Password@123',
    '12345678', '123456789', '1234567890', 'admin123', 'Admin123', 'Admin123!', 'Admin@123',
    'Raqiis123', 'raqiis123', 'Raqiis777', 'raqiis777', 'raqiis', 'Raqiis', 'RaqiisElectronics',
    'electronics123', 'Electronics123', 'smartstock', 'SmartStock123', 'tillpro', 'TillPro123',
    'khalil123', 'Khalil123', 'Khalil123!', 'Wali123', 'wali123', 'Abdi123', 'Abdiwali123',
    'Somalia123', 'Nairobi123', 'Kenya123', 'Mogadishu123'
  ]

  for (const p of wordlist) {
    if (await verifyPassword(p, user.passwordHash)) {
      console.log('>>> MATCH FOUND FOR tcusub777@gmail.com:', p)
      return
    }
  }

  console.log('No match found in candidate wordlist')
}

check().then(() => prisma.$disconnect()).catch(console.error)
