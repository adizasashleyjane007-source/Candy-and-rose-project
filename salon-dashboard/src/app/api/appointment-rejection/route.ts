import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { 
      email, 
      customerName, 
      date, 
      time, 
      service, 
      reason 
    } = await request.json();

    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY is missing.");
      return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
    }

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const { data, error } = await resend.emails.send({
      from: "Candy & Rose <onboarding@resend.dev>",
      to: [email],
      subject: "Update Regarding Your Appointment - Candy & Rose Salon",
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #fce7f3; border-radius: 32px; background-color: #ffffff; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">

          <h2 style="color: #4b5563; text-align: center; font-size: 28px; margin-bottom: 20px;">Appointment Update</h2>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Hello <strong>${customerName}</strong>,
          </p>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            We're writing to inform you that we are unable to confirm your appointment at this time.
          </p>

          <div style="background-color: #fefce8; padding: 25px; border-radius: 20px; border: 1px solid #fef3c7; margin: 30px 0;">
            <p style="margin: 0 0 10px 0; color: #92400e; font-weight: 800; text-transform: uppercase; font-size: 11px; letter-spacing: 0.1em;">Reason for Rejection</p>
            <p style="margin: 0; color: #b45309; font-size: 15px; font-style: italic; line-height: 1.5;">
              "${reason || "No specific reason provided. Please contact the salon for more details."}"
            </p>
          </div>
          
          <div style="background-color: #fcfcfc; padding: 30px; border-radius: 24px; border: 1px solid #f3f4f6; margin: 30px 0;">
            <p style="margin: 0 0 20px 0; color: #4b5563; font-weight: 800; text-transform: uppercase; font-size: 12px; letter-spacing: 0.1em;">Appointment Details</p>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 12px 0; color: #6b7280; font-size: 14px; font-weight: 500;">Date:</td>
                <td style="padding: 12px 0; color: #111827; font-weight: 700; font-size: 14px; text-align: right;">${date}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 12px 0; color: #6b7280; font-size: 14px; font-weight: 500;">Time:</td>
                <td style="padding: 12px 0; color: #111827; font-weight: 700; font-size: 14px; text-align: right;">${time}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; color: #6b7280; font-size: 14px; font-weight: 500;">Service:</td>
                <td style="padding: 12px 0; color: #111827; font-weight: 700; font-size: 14px; text-align: right;">${service}</td>
              </tr>
            </table>
          </div>

          <p style="color: #4b5563; font-size: 14px; text-align: center;">
            We apologize for any inconvenience. Please feel free to book another time slot that works for you or contact us directly.
          </p>

          <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 40px 0 20px 0;" />
          
          <div style="text-align: center;">
            <p style="font-size: 12px; color: #9ca3af; margin: 0;">
              © 2026 Candy & Rose Salon. We hope to see you soon.
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("Resend Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("Server Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
