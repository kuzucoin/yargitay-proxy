const express = require('express')
const app = express()
app.use(express.json())

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

const BEDESTEN = 'https://bedesten.adalet.gov.tr'
const HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Accept': '*/*',
  'Accept-Language': 'tr-TR,tr;q=0.9',
  'Adaletapplicationname': 'UyapMevzuat',
  'Origin': 'https://mevzuat.adalet.gov.tr',
  'Referer': 'https://mevzuat.adalet.gov.tr/',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
}

let cookie = ''
let cookieExpiry = 0

async function getCookie() {
  if (cookie && Date.now() < cookieExpiry) return cookie
  try {
    const res = await fetch('https://mevzuat.adalet.gov.tr/', {
      headers: { 'User-Agent': HEADERS['User-Agent'], 'Accept': 'text/html' }
    })
    const sc = res.headers.get('set-cookie') ?? ''
    cookie = sc.split(',').map(c => c.split(';')[0].trim()).filter(Boolean).join('; ')
    cookieExpiry = Date.now() + 25 * 60 * 1000
  } catch(e) {}
  return cookie
}

app.post('/ara', async (req, res) => {
  try {
    const { arananKelime, aranan, pageSize, pageNumber, birimAdi, baslangicTarihi, bitisTarihi } = req.body
    const phrase = arananKelime || aranan || ''
    const c = await getCookie()
    const payload = {
      applicationName: 'UyapMevzuat',
      paging: true,
      data: {
        phrase,
        itemTypeList: ['YARGITAYKARARI'],
        pageSize: Math.min(Number(pageSize) || 10, 10),
        pageNumber: Number(pageNumber) || 1,
        birimAdi: birimAdi || 'ALL',
        sortFields: ['KARAR_TARIHI'],
        sortDirection: 'desc',
        ...(baslangicTarihi && { kararTarihiStart: baslangicTarihi }),
        ...(bitisTarihi && { kararTarihiEnd: bitisTarihi }),
      }
    }
    const r = await fetch(BEDESTEN + '/emsal-karar/searchDocuments', {
      method: 'POST',
      headers: { ...HEADERS, ...(c ? { Cookie: c } : {}) },
      body: JSON.stringify(payload)
    })
    const data = await r.json()
    res.json(data)
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/getir', async (req, res) => {
  try {
    const { documentId } = req.body
    const c = await getCookie()
    const r = await fetch(BEDESTEN + '/emsal-karar/getDocumentContent', {
      method: 'POST',
      headers: { ...HEADERS, ...(c ? { Cookie: c } : {}) },
      body: JSON.stringify({ applicationName: 'UyapMevzuat', data: { documentId } })
    })
    const data = await r.json()
    res.json(data)
  } catch(err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/health', (req, res) => res.json({ status: 'ok' }))

const PORT = process.env.PORT || 8080
app.listen(PORT, () => console.log('Bedesten proxy port ' + PORT))
