import * as aramex from "./aramex"
import * as freightExchange from "./freightexchange"
import type { QuoteRequest, CarrierQuote, CourierResult } from "./types"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function getQuotes(request: QuoteRequest): Promise<CarrierQuote[]> {
  // Run both providers in parallel
  const [aramexQuotes, fxQuotes] = await Promise.allSettled([
    aramex.getQuote(request),
    freightExchange.getQuote(request),
  ])

  const allQuotes: CarrierQuote[] = [
    ...(aramexQuotes.status === "fulfilled" ? aramexQuotes.value : []),
    ...(fxQuotes.status === "fulfilled" ? fxQuotes.value : []),
  ]

  if (aramexQuotes.status === "rejected") {
    console.error("Aramex quote failed:", aramexQuotes.reason)
  }
  if (fxQuotes.status === "rejected") {
    console.error("FX quote failed:", fxQuotes.reason)
  }

  // Sort by price ascending
  return allQuotes.sort((a, b) => a.price - b.price)
}

export async function bookCheapest(
  request: QuoteRequest,
  quotes: CarrierQuote[]
): Promise<CourierResult> {
  if (quotes.length === 0) {
    return { success: false, allQuotes: [], error: "No quotes available from any carrier" }
  }

  const cheapest = quotes[0]

  try {
    let booking
    if (cheapest.provider === "aramex") {
      booking = await aramex.book(request)
    } else {
      booking = await freightExchange.book(request, cheapest.carrier)
    }

    // Override price with the quoted price
    booking.price = cheapest.price

    // Email the label to the factory
    await emailLabel(booking, request)

    return { success: true, booking, allQuotes: quotes }
  } catch (err: any) {
    return { success: false, allQuotes: quotes, error: err.message }
  }
}

async function emailLabel(
  booking: { carrier: string; price: number; trackingNumber?: string; labelUrl?: string; labelPdf?: Buffer },
  request: QuoteRequest
) {
  const factoryEmail = process.env.FACTORY_EMAIL
  if (!factoryEmail) {
    console.error("No FACTORY_EMAIL configured, skipping label email")
    return
  }

  const attachments: { filename: string; content: string }[] = []
  if (booking.labelPdf) {
    attachments.push({
      filename: `label-${booking.trackingNumber || "shipment"}.pdf`,
      content: booking.labelPdf.toString("base64"),
    })
  }

  const labelLink = booking.labelUrl
    ? `<p><a href="${booking.labelUrl}">Download Label PDF</a></p>`
    : ""

  await resend.emails.send({
    from: "Hemp Harvests Trace <trace@hempharvests.com.au>",
    to: factoryEmail,
    subject: `📦 Shipping Label — ${booking.carrier} to ${request.to.suburb} ${request.to.postcode}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">📦 Courier Shipment Booked</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <tr>
            <td style="padding: 8px 12px; font-weight: 600; color: #555; border-bottom: 1px solid #eee;">Carrier</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${booking.carrier}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: 600; color: #555; border-bottom: 1px solid #eee;">Price</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">$${booking.price.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: 600; color: #555; border-bottom: 1px solid #eee;">Tracking</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${booking.trackingNumber || "Pending"}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: 600; color: #555; border-bottom: 1px solid #eee;">Destination</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${request.to.name}<br/>${request.to.street}<br/>${request.to.suburb} ${request.to.state} ${request.to.postcode}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: 600; color: #555; border-bottom: 1px solid #eee;">Boxes</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${request.boxes.length} box(es) — ${request.boxes.map((b, i) => `Box ${i + 1}: ${b.weightKg}kg`).join(", ")}</td>
          </tr>
        </table>
        ${labelLink}
        ${attachments.length > 0 ? "<p>Label PDF attached — print and apply to boxes.</p>" : ""}
        <p style="margin-top: 20px; color: #888; font-size: 13px;">
          Booked automatically by <a href='https://trace.hempharvests.com.au'>Hemp Harvests Trace</a>
        </p>
      </div>
    `,
    attachments: attachments.map((a) => ({
      filename: a.filename,
      content: Buffer.from(a.content, "base64"),
    })),
  })
}
