import { Resend } from "resend"
import { NextResponse } from "next/server"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  try {
    const { orderNumber, customer, details, dueDate } = await req.json()

    const recipientEmail = process.env.ORDER_NOTIFICATION_EMAIL
    if (!recipientEmail) {
      return NextResponse.json({ error: "No recipient email configured" }, { status: 500 })
    }

    const { data, error } = await resend.emails.send({
      from: "Hemp Harvests Trace <onboarding@resend.dev>",
      to: recipientEmail,
      subject: `New Order: ${orderNumber} — ${customer}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16a34a;">🌿 New Order Received</h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
            <tr>
              <td style="padding: 8px 12px; font-weight: 600; color: #555; border-bottom: 1px solid #eee;">Order #</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${orderNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; font-weight: 600; color: #555; border-bottom: 1px solid #eee;">Customer</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${customer}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; font-weight: 600; color: #555; border-bottom: 1px solid #eee;">Details</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${details}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; font-weight: 600; color: #555; border-bottom: 1px solid #eee;">Due Date</td>
              <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${dueDate}</td>
            </tr>
          </table>
          <p style="margin-top: 20px; color: #888; font-size: 13px;">
            View full details at <a href="https://trace.hempharvests.com.au">trace.hempharvests.com.au</a>
          </p>
        </div>
      `,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data?.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
