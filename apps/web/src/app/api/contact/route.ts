import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ContactFormData = await request.json();

    // Validate required fields
    if (!body.name || !body.email || !body.subject || !body.message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Send email to admin
    const adminEmailData = await resend.emails.send({
      from: "noreply@shapebazaar.com",
      to: "hello@shapebazaar.com",
      replyTo: body.email,
      subject: `New Contact Form: ${body.subject}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${body.name}</p>
        <p><strong>Email:</strong> ${body.email}</p>
        ${body.phone ? `<p><strong>Phone:</strong> ${body.phone}</p>` : ""}
        <p><strong>Subject:</strong> ${body.subject}</p>
        <hr />
        <p><strong>Message:</strong></p>
        <p>${body.message.replace(/\n/g, "<br />")}</p>
      `,
    });

    // Send confirmation email to user
    const userEmailData = await resend.emails.send({
      from: "noreply@shapebazaar.com",
      to: body.email,
      subject: "Thank you for contacting ShapeBazaar",
      html: `
        <h2>Thank you for reaching out!</h2>
        <p>Hi ${body.name},</p>
        <p>We have received your message and will get back to you within 24 hours.</p>
        <p>Here's a copy of your message:</p>
        <hr />
        <p><strong>Subject:</strong> ${body.subject}</p>
        <p>${body.message.replace(/\n/g, "<br />")}</p>
        <hr />
        <p>Best regards,<br />ShapeBazaar Team</p>
      `,
    });

    // Check if emails were sent successfully
    if (adminEmailData.error || userEmailData.error) {
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Email sent successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
