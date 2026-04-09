import type { QuoteRequest, CarrierQuote, BookingResult } from "./types"

const BASE_URL = "https://api.myfastway.com.au"

let cachedToken: { accessToken: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.accessToken
  }

  const res = await fetch(`${BASE_URL}/api/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.ARAMEX_CLIENT_ID!,
      client_secret: process.env.ARAMEX_CLIENT_SECRET!,
    }),
  })

  if (!res.ok) {
    throw new Error(`Aramex auth failed: ${res.status} ${await res.text()}`)
  }

  const data = await res.json()
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
  return cachedToken.accessToken
}

async function apiRequest(method: string, path: string, body?: unknown) {
  const token = await getAccessToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "api-version": "1.0",
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Aramex API ${method} ${path} failed: ${res.status} ${text}`)
  }

  return res.json()
}

export async function getQuote(request: QuoteRequest): Promise<CarrierQuote[]> {
  try {
    const totalWeight = request.boxes.reduce((sum, b) => sum + b.weightKg, 0)

    const quoteData = await apiRequest("POST", "/api/consignments/quote", {
      fromAddress: {
        streetAddress: request.from.street,
        locality: request.from.suburb,
        stateProvince: request.from.state,
        postcode: request.from.postcode,
        country: "AU",
      },
      toAddress: {
        streetAddress: request.to.street,
        locality: request.to.suburb,
        stateProvince: request.to.state,
        postcode: request.to.postcode,
        country: "AU",
      },
      parcels: request.boxes.map((box) => ({
        quantity: 1,
        weightKg: box.weightKg,
        lengthCm: box.lengthCm,
        widthCm: box.widthCm,
        heightCm: box.heightCm,
      })),
      totalWeightKg: totalWeight,
    })

    const services = quoteData.data || []
    return services.map((svc: any) => ({
      carrier: "Aramex",
      service: svc.name || svc.serviceType || "Standard",
      price: svc.totalprice ?? svc.totalPrice ?? svc.total ?? 0,
      estimatedDays: svc.etaBusinessDays ?? svc.transitDays,
      provider: "aramex" as const,
    }))
  } catch (err: any) {
    console.error("Aramex quote error:", err.message)
    return []
  }
}

export async function book(request: QuoteRequest): Promise<BookingResult> {
  const consignment = await apiRequest("POST", "/api/consignments", {
    consignmentType: "Domestic",
    shipper: {
      contactName: request.from.name,
      businessName: request.from.company || request.from.name,
      address: {
        streetAddress: request.from.street,
        locality: request.from.suburb,
        stateProvince: request.from.state,
        postcode: request.from.postcode,
        country: "AU",
      },
      phoneNumber: request.from.phone || "",
      email: request.from.email || "",
    },
    receiver: {
      contactName: request.to.name,
      businessName: request.to.company || request.to.name,
      address: {
        streetAddress: request.to.street,
        locality: request.to.suburb,
        stateProvince: request.to.state,
        postcode: request.to.postcode,
        country: "AU",
      },
      phoneNumber: request.to.phone || "",
      email: request.to.email || "",
    },
    parcels: request.boxes.map((box) => ({
      quantity: 1,
      weightKg: box.weightKg,
      lengthCm: box.lengthCm,
      widthCm: box.widthCm,
      heightCm: box.heightCm,
    })),
  })

  const consignmentId = consignment.data?.consignmentId || consignment.data?.id

  // Download label PDF
  const labelRes = await fetch(
    `${BASE_URL}/api/consignments/${consignmentId}/labels`,
    {
      headers: {
        Authorization: `Bearer ${await getAccessToken()}`,
        Accept: "application/pdf",
      },
    }
  )

  let labelPdf: Buffer | undefined
  let labelUrl: string | undefined
  if (labelRes.ok) {
    const contentType = labelRes.headers.get("content-type") || ""
    if (contentType.includes("pdf")) {
      labelPdf = Buffer.from(await labelRes.arrayBuffer())
    } else {
      const labelData = await labelRes.json()
      labelUrl = labelData.data?.labelUrl || labelData.data?.url
    }
  }

  return {
    provider: "aramex",
    carrier: "Aramex",
    service: "Standard",
    price: consignment.data?.totalCost ?? 0,
    trackingNumber: consignment.data?.trackingNumber || consignmentId,
    consignmentId,
    labelUrl,
    labelPdf,
  }
}
