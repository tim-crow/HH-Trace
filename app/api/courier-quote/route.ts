import { NextResponse } from "next/server"
import { getQuotes, bookCheapest } from "@/lib/freight/courier"
import type { QuoteRequest, CarrierQuote } from "@/lib/freight/types"

// POST /api/courier-quote
// body: { action: "quote" | "book", request: QuoteRequest, quotes?: CarrierQuote[] }
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { action, request, quotes } = body as {
      action: "quote" | "book"
      request: QuoteRequest
      quotes?: CarrierQuote[]
    }

    if (!request?.from || !request?.to || !request?.boxes?.length) {
      return NextResponse.json(
        { error: "Missing shipment details (from, to, boxes)" },
        { status: 400 }
      )
    }

    if (action === "quote") {
      const allQuotes = await getQuotes(request)
      if (allQuotes.length === 0) {
        return NextResponse.json(
          { error: "No quotes returned from any carrier. Check addresses and try again." },
          { status: 422 }
        )
      }
      return NextResponse.json({ quotes: allQuotes })
    }

    if (action === "book") {
      if (!quotes || quotes.length === 0) {
        return NextResponse.json({ error: "No quotes provided for booking" }, { status: 400 })
      }
      const result = await bookCheapest(request, quotes)
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 })
      }
      return NextResponse.json({
        booking: {
          carrier: result.booking!.carrier,
          service: result.booking!.service,
          price: result.booking!.price,
          trackingNumber: result.booking!.trackingNumber,
          provider: result.booking!.provider,
        },
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (err: any) {
    console.error("Courier quote route error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
