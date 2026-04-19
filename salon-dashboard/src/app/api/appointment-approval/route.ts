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
      price, 
      staff 
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
      subject: "Your Appointment is Approved! - Candy & Rose Salon",
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #fce7f3; border-radius: 32px; background-color: #ffffff; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">

          
          <h2 style="color: #ec4899; text-align: center; font-size: 28px; margin-bottom: 20px;">Appointment Approved!</h2>
          
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Thank you for choosing the <strong>Candy and Rose Salon</strong>, <strong>${customerName}</strong>. 
            We're excited to let you know that your appointment has been officially approved!
          </p>
          
          <div style="background-color: #fffafb; padding: 30px; border-radius: 24px; border: 1px solid #fce7f3; margin: 30px 0;">
            <p style="margin: 0 0 20px 0; color: #db2777; font-weight: 800; text-transform: uppercase; font-size: 12px; letter-spacing: 0.1em;">Appointment Summary</p>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #fce7f3;">
                <td style="padding: 12px 0; color: #000000; font-size: 14px; font-weight: 500;">Date:</td>
                <td style="padding: 12px 0; color: #000000; font-weight: 700; font-size: 14px; text-align: right;">${date}</td>
              </tr>
              <tr style="border-bottom: 1px solid #fce7f3;">
                <td style="padding: 12px 0; color: #000000; font-size: 14px; font-weight: 500;">Time:</td>
                <td style="padding: 12px 0; color: #000000; font-weight: 700; font-size: 14px; text-align: right;">${time}</td>
              </tr>
              <tr style="border-bottom: 1px solid #fce7f3;">
                <td style="padding: 12px 0; color: #000000; font-size: 14px; font-weight: 500;">Service:</td>
                <td style="padding: 12px 0; color: #000000; font-weight: 700; font-size: 14px; text-align: right;">${service}</td>
              </tr>
              <tr style="border-bottom: 1px solid #fce7f3;">
                <td style="padding: 12px 0; color: #000000; font-size: 14px; font-weight: 500;">Staff:</td>
                <td style="padding: 12px 0; color: #000000; font-weight: 700; font-size: 14px; text-align: right;">${staff}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; color: #000000; font-size: 14px; font-weight: 500;">Total Price:</td>
                <td style="padding: 12px 0; color: #000000; font-weight: 800; font-size: 16px; text-align: right;">₱${Number(price).toLocaleString()}</td>
              </tr>
            </table>
          </div>

          <p style="color: #4b5563; font-size: 14px; text-align: center; font-style: italic;">
            We look forward to seeing you soon! If you need to reschedule, please contact us at least 24 hours in advance.
          </p>

          <hr style="border: none; border-top: 1px solid #fce7f3; margin: 40px 0 20px 0;" />
          
          <div style="text-align: center;">
            <p style="font-size: 12px; color: #9ca3af; margin: 0;">
              © 2026 Candy & Rose Salon. Beautiful moments start here.
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
