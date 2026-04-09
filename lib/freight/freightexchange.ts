import type { QuoteRequest, CarrierQuote, BookingResult } from "./types"

// FreightExchange browser automation using Playwright
// Portal: portal.freightexchange.com.au (SPA)
//
// Phase 1 — Quote Only:  login → /get-a-quote → goods → origin suburb → dest suburb → submit → parse prices
// Phase 2 — Full Book:   select carrier → fill origin tab → fill dest tab → save → confirm → payment dialog
// Phase 3 — Labels:      /book → download label PDF → book pickup

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pw: any = null
async function getPlaywright() {
  if (!pw) pw = await (Function('return import("playwright")')())
  return pw
}

const PORTAL = "https://portal.freightexchange.com.au"
const COOKIE_PATH = "/tmp/fx-cookies.json"

// ─── Session persistence ───────────────────────────────────────

async function saveCookies(context: any) {
  const fs = await import("fs")
  const cookies = await context.cookies()
  fs.writeFileSync(COOKIE_PATH, JSON.stringify(cookies))
}

async function loadCookies(context: any): Promise<boolean> {
  const fs = await import("fs")
  try {
    if (fs.existsSync(COOKIE_PATH)) {
      const cookies = JSON.parse(fs.readFileSync(COOKIE_PATH, "utf-8"))
      await context.addCookies(cookies)
      return true
    }
  } catch {}
  return false
}

// ─── Login (2-step: email → password) ──────────────────────────

async function login(page: any, context: any) {
  // Try reusing saved session
  const hasCookies = await loadCookies(context)
  if (hasCookies) {
    await page.goto(`${PORTAL}/get-a-quote`)
    await page.waitForLoadState("networkidle")
    if (!page.url().includes("/login")) return
  }

  await page.goto(`${PORTAL}/login`)
  await page.waitForLoadState("networkidle")

  // Step 1: Email — placeholder "Eg: johnsmith@email.com"
  await page.locator('input[placeholder*="email"]').fill(process.env.FX_EMAIL!)
  await page.locator('button:has-text("Login")').click()

  // Step 2: Password — placeholder "Type your password"
  await page.locator('input[placeholder="Type your password"]').waitFor({ timeout: 10_000 })
  await page.locator('input[placeholder="Type your password"]').fill(process.env.FX_PASSWORD!)
  await page.locator('button:has-text("Login")').click()

  // Wait for redirect to /quote (default landing page)
  await page.waitForURL('**/quote**', { timeout: 15_000 })
  await page.waitForLoadState("networkidle")

  await saveCookies(context)
}

// ─── Autocomplete combobox helper ──────────────────────────────
// Suburb, postcode, and address line 1 fields are all autocomplete.
// Must type → wait for dropdown options → click matching option.
// Options format: "SuburbName, STATE Postcode" (e.g. "Warana, QLD 4575")

async function fillAutocomplete(page: any, locator: any, searchText: string) {
  await locator.click()
  await locator.fill("")
  await locator.type(searchText, { delay: 80 })

  // Wait for dropdown listbox options to appear
  await page.waitForSelector('[role="option"], [role="listbox"] li, [class*="option"]', {
    timeout: 8_000,
  }).catch(() => {})

  const options = page.locator('[role="option"], [role="listbox"] li, [class*="option"]')
  const count = await options.count()

  // Click the first option that contains our search text
  for (let i = 0; i < count; i++) {
    const text = (await options.nth(i).textContent()) || ""
    if (text.toLowerCase().includes(searchText.toLowerCase().split(",")[0].split(" ")[0])) {
      await options.nth(i).click()
      return
    }
  }
  // Fallback: click first option
  if (count > 0) await options.first().click()
}

// ─── Quote form: goods → origin → destination → submit ────────

async function submitQuoteForm(page: any, request: QuoteRequest) {
  await page.goto(`${PORTAL}/get-a-quote`)
  await page.waitForLoadState("networkidle")

  // ── GOODS ──
  // Qty (spinbutton / number input)
  await page.locator('input[type="number"], [role="spinbutton"]').first().fill(String(request.boxes.length))

  // Item weight(kg) — placeholder "In kg"
  await page.locator('input[placeholder="In kg"]').fill(String(request.boxes[0].weightKg))

  // Length, Width, Height — all placeholder "In cm" (3 inputs in order)
  const cmInputs = page.locator('input[placeholder="In cm"]')
  await cmInputs.nth(0).fill(String(request.boxes[0].lengthCm))
  await cmInputs.nth(1).fill(String(request.boxes[0].widthCm))
  await cmInputs.nth(2).fill(String(request.boxes[0].heightCm))

  // Packaging defaults to "Box/Carton" — no change needed

  // Confirm goods
  await page.locator('button:has-text("Confirm")').click()
  await page.waitForLoadState("networkidle")

  // ── ORIGIN ──
  // Toggle OFF "Select from Address Book" to use manual entry
  const originToggle = page.locator('text=Select from Address Book').locator('..').locator('[role="switch"], input[type="checkbox"]').first()
  if (await originToggle.count() > 0) {
    const isChecked = await originToggle.isChecked().catch(() => true)
    if (isChecked) await originToggle.click()
    await page.waitForLoadState("networkidle")
  }

  // Location Type — combobox labeled "Location Type"
  const originLocType = request.from.locationType || "Factory/Warehouse"
  const originLocDropdown = page.getByLabel("Location Type").or(page.locator('[aria-label="Location Type"]'))
  if (await originLocDropdown.count() > 0) {
    await originLocDropdown.click()
    await page.locator(`[role="option"]:has-text("${originLocType}")`).click()
  }

  // Suburb or Postcode — autocomplete combobox
  const originSuburb = page.getByLabel("Suburb or Postcode").or(page.locator('[aria-label*="Suburb"]')).first()
  await fillAutocomplete(page, originSuburb, `${request.from.suburb}`)

  // Confirm origin
  await page.locator('button:has-text("Confirm")').click()
  await page.waitForLoadState("networkidle")

  // ── DESTINATION ──
  // Toggle OFF address book
  const destToggle = page.locator('text=Select from Address Book').locator('..').locator('[role="switch"], input[type="checkbox"]').first()
  if (await destToggle.count() > 0) {
    const isChecked = await destToggle.isChecked().catch(() => true)
    if (isChecked) await destToggle.click()
    await page.waitForLoadState("networkidle")
  }

  // Location Type
  const destLocType = request.to.locationType || "Residential"
  const destLocDropdown = page.getByLabel("Location Type").or(page.locator('[aria-label="Location Type"]'))
  if (await destLocDropdown.count() > 0) {
    await destLocDropdown.click()
    await page.locator(`[role="option"]:has-text("${destLocType}")`).click()
  }

  // Suburb or Postcode — autocomplete
  const destSuburb = page.getByLabel("Suburb or Postcode").or(page.locator('[aria-label*="Suburb"]')).first()
  await fillAutocomplete(page, destSuburb, `${request.to.suburb}`)

  // Authority To Leave (default) or Signature Required
  const atlRadio = page.locator('[role="radio"]:near(:text("Authority To Leave"))').or(page.getByLabel("Authority To Leave"))
  if (await atlRadio.count() > 0) await atlRadio.click()

  // Confirm destination
  await page.locator('button:has-text("Confirm")').click()
  await page.waitForLoadState("networkidle")

  // ── SUBMIT: click the → arrow button at far right of wizard bar ──
  await page.locator('button:has-text("arrow_forward"), button[class*="arrow"]').click()
    .catch(() => page.locator('button:has(svg)').filter({ hasNotText: /Confirm|Cancel|Add|Login/ }).last().click())

  // Wait for results: "Searching quotes for you..." disappears → "We found X quotes for you"
  await page.waitForSelector('text=We found', { timeout: 30_000 })
  await page.waitForLoadState("networkidle")
}

// ──────────────────────────────────────────────
// Phase 1: Get Quote (price comparison only)
// ──────────────────────────────────────────────

export async function getQuote(request: QuoteRequest): Promise<CarrierQuote[]> {
  const { chromium } = await getPlaywright()
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    await login(page, context)
    await submitQuoteForm(page, request)

    // Parse carrier quote cards
    // Each card: carrier name, service, "AUD XX.XX" (ex GST), "Select →" button
    // Skip "BYO Carriers" promo card (has "Subscribe" not "Select")
    const quotes: CarrierQuote[] = []
    const selectButtons = page.locator('button:has-text("Select")')
    const count = await selectButtons.count()

    for (let i = 0; i < count; i++) {
      const btn = selectButtons.nth(i)
      // Walk up to the enclosing card container
      const card = btn.locator('xpath=ancestor::div[contains(@class,"card") or contains(@class,"quote") or contains(@class,"col")][1]')
        .or(btn.locator('xpath=ancestor::div[4]'))
      const cardText = (await card.textContent().catch(() => "")) || ""

      // Price ex GST: first "AUD XX.XX" in the card
      const priceMatch = cardText.match(/AUD\s+([\d,.]+)/)
      const price = priceMatch ? parseFloat(priceMatch[1].replace(",", "")) : 0
      if (price <= 0) continue

      // Inc GST price
      const inclMatch = cardText.match(/AUD\s+([\d,.]+)\s*incl/)
      const priceIncGst = inclMatch ? parseFloat(inclMatch[1].replace(",", "")) : price * 1.1

      // Carrier name: text before first "AUD"
      const beforePrice = (cardText.split(/AUD/)[0] || "").trim()
      // Clean up: remove service description, delivery info that leaks in
      const carrier = beforePrice
        .replace(/(Authority to Leave|Signature|Road Express|Fixed Price|Premium|Technology Express|Overnight Express|General|Express Parcel|Economy).*$/i, "")
        .replace(/Earliest Pickup.*/i, "")
        .replace(/\(Delivery.*/i, "")
        .replace(/\s+/g, " ")
        .trim()

      // Service name
      const serviceMatch = cardText.match(/(Authority to Leave|Signature|Road Express|Fixed Price Premium|Technology Express|Overnight Express|Express Parcel|Premium|General|Economy|Standard)/i)
      const service = serviceMatch ? serviceMatch[1] : "Standard"

      quotes.push({
        carrier: carrier || `Carrier ${i + 1}`,
        service,
        price,
        provider: "freightexchange",
      })
    }

    quotes.sort((a, b) => a.price - b.price)
    return quotes
  } catch (err: any) {
    console.error("FreightExchange quote error:", err.message)
    return []
  } finally {
    await browser.close()
  }
}

// ──────────────────────────────────────────────
// Phase 2 + 3: Book + Get Labels
// ──────────────────────────────────────────────

export async function book(request: QuoteRequest, cheapestCarrier?: string): Promise<BookingResult> {
  const { chromium } = await getPlaywright()
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    await login(page, context)
    await submitQuoteForm(page, request)

    // ── Step 7: Select carrier ──
    if (cheapestCarrier) {
      const carrierCard = page.locator(`text=${cheapestCarrier}`).first()
      const selectBtn = carrierCard.locator('xpath=ancestor::div[4]//button[contains(., "Select")]')
      if (await selectBtn.count() > 0) {
        await selectBtn.first().click()
      } else {
        await page.locator('button:has-text("Select")').first().click()
      }
    } else {
      await page.locator('button:has-text("Select")').first().click()
    }

    // Lands on /quote page
    await page.waitForURL('**/quote**', { timeout: 15_000 })
    await page.waitForLoadState("networkidle")

    // ── Step 8: Fill booking dialog — Origin tab ──
    // Click edit (pencil) button on the quote row to open booking dialog
    const editBtn = page.locator('button:has(svg)').filter({ hasNotText: /Confirm|Label|Book|Select/ }).first()
    await editBtn.click()
    await page.waitForLoadState("networkidle")

    // Click "Origin" tab in the dialog
    await page.locator('[role="dialog"] >> text=Origin').or(page.locator('text=Origin')).first().click()
    await page.waitForLoadState("networkidle")

    // Fill origin fields — placeholders from the guide
    await page.locator('input[placeholder*="Freight Exchange"], input[placeholder*="Company"]').first()
      .fill(request.from.company || "Hemp Harvests Pty Ltd")
    await page.locator('input[placeholder*="Alex Holder"], input[placeholder*="Contact"]').first()
      .fill(request.from.name)
    await page.locator('input[placeholder*="0455045509"], input[placeholder*="Phone"]').first()
      .fill(request.from.phone || "")
    await page.locator('input[placeholder*="john.smith@gmail.com"], input[placeholder*="Email"]').first()
      .fill(request.from.email || "")

    // Address line 1 — autocomplete combobox
    const originAddr = page.locator('input[placeholder*="Address"], [aria-label*="Address line 1"]').first()
    if (await originAddr.count() > 0) {
      await fillAutocomplete(page, originAddr, request.from.street)
    }

    // Save origin
    await page.locator('button:has-text("Save")').click()
    await page.waitForLoadState("networkidle")

    // ── Step 9: Fill booking dialog — Destination tab ──
    // Re-open dialog if it closed, or click Destination tab
    const destTab = page.locator('[role="dialog"] >> text=Destination').or(page.locator('text=Destination'))
    if (await destTab.count() > 0) {
      await destTab.first().click()
    } else {
      // Dialog closed — click edit button again
      await editBtn.click()
      await page.waitForLoadState("networkidle")
      await page.locator('text=Destination').first().click()
    }
    await page.waitForLoadState("networkidle")

    // Fill destination fields
    await page.locator('input[placeholder*="Company"], input[placeholder*="Receiver"]').first()
      .fill(request.to.company || request.to.name)
    await page.locator('input[placeholder*="Contact"], input[placeholder*="Attn"]').first()
      .fill(request.to.name)
    await page.locator('input[placeholder*="Phone"]').first()
      .fill(request.to.phone || "")
    await page.locator('input[placeholder*="Email"]').first()
      .fill(request.to.email || "")

    // Address line 1 — autocomplete
    const destAddr = page.locator('input[placeholder*="Address"], [aria-label*="Address line 1"]').first()
    if (await destAddr.count() > 0) {
      await fillAutocomplete(page, destAddr, request.to.street)
    }

    // Save destination
    await page.locator('button:has-text("Save")').click()
    await page.waitForLoadState("networkidle")

    // ── Step 10: Confirm (button now enabled) ──
    // Scrape price before confirming
    const pageText = await page.textContent("body") || ""
    const priceMatch = pageText.match(/AUD\s+([\d,.]+)/)
    const selectedPrice = priceMatch ? parseFloat(priceMatch[1].replace(",", "")) : 0

    // ⚠️ Price safeguard — abort if over $65 per box
    const perBoxLimit = parseFloat(process.env.FX_MAX_PER_BOX_PRICE || "65")
    const maxPrice = perBoxLimit * request.boxes.length
    if (selectedPrice > maxPrice) {
      throw new Error(`Price AUD ${selectedPrice.toFixed(2)} exceeds $${perBoxLimit}/box limit (${request.boxes.length} boxes = AUD ${maxPrice.toFixed(2)} max). Book manually.`)
    }

    // Wait for Confirm button to be enabled, then click
    await page.locator('button:has-text("Confirm"):not([disabled])').waitFor({ timeout: 10_000 })
    await page.locator('button:has-text("Confirm"):not([disabled])').first().click()

    // ── Step 7B: Payment confirmation dialog ──
    // Wait for modal with heading "Confirm"
    const dialog = page.locator('[role="dialog"], [class*="modal"]')
    await dialog.waitFor({ timeout: 10_000 })

    // "Pay with a Credit Card" should be default selected
    // Saved card xxxx 8342 should be pre-selected
    // Click Confirm inside the dialog — this charges the card
    await dialog.locator('button:has-text("Confirm")').click()
    await page.waitForLoadState("networkidle")

    // ── Step 13: Get labels from /book page ──
    await page.waitForURL('**/book**', { timeout: 15_000 })
    await page.waitForLoadState("networkidle")

    let labelPdf: Buffer | undefined

    // Click "Label" button (printer icon) on the shipment row
    const labelBtn = page.locator('button:has-text("Label")')
    if (await labelBtn.count() > 0) {
      const downloadPromise = page.waitForEvent("download", { timeout: 15_000 })
      await labelBtn.first().click()

      try {
        const download = await downloadPromise
        const dlPath = await download.path()
        if (dlPath) {
          const fs = await import("fs")
          labelPdf = fs.readFileSync(dlPath)
        }
      } catch {
        console.log("FX: Label may have opened in new tab instead of downloading")
      }
    }

    // ── Step 14: Book Pickup ──
    const bookPickupBtn = page.locator('button:has-text("Book Pickup")')
    if (await bookPickupBtn.count() > 0) {
      await bookPickupBtn.first().click()
      await page.waitForLoadState("networkidle")
    }

    // Grab FE reference number (format: FE1234567)
    const bodyText = await page.textContent("body") || ""
    const refMatch = bodyText.match(/FE\d{7}/)

    return {
      provider: "freightexchange",
      carrier: cheapestCarrier || "FreightExchange Carrier",
      service: "Road Express",
      price: selectedPrice,
      trackingNumber: refMatch?.[0],
      labelPdf,
    }
  } catch (err: any) {
    console.error("FreightExchange booking error:", err.message)
    throw new Error(`FreightExchange booking failed: ${err.message}`)
  } finally {
    await browser.close()
  }
}
