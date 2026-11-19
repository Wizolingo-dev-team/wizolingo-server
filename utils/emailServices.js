// utils/emailServices.js
const { Resend } = require("resend");

const BRAND_NAME = "Wiz Ofuasia (Wizboyy) — Wizolingo";
const BRAND_COLOR = "#D70E1D";
const SECONDARY_COLOR = "#141414";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const ADMIN_FRONTEND_URL =
  process.env.ADMIN_FRONTEND_URL || "http://localhost:3001";

const getResendClient = () => {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
};

const emailWrapper = (content) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #262626; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
    <div style="background-color: ${SECONDARY_COLOR}; padding: 24px 20px; text-align: center; border-bottom: 3px solid ${BRAND_COLOR};">
      <h1 style="color: #ffffff; margin: 0; letter-spacing: 2px; font-size: 20px; text-transform: uppercase;">${BRAND_NAME}</h1>
    </div>
    <div style="padding: 30px; color: #222222; line-height: 1.6; background-color: #ffffff;">
      ${content}
    </div>
    <div style="background-color: #f7f7f7; padding: 20px; text-align: center; font-size: 12px; color: #777777; border-top: 1px solid #eeeeee;">
      <p style="margin: 0;">&copy; ${new Date().getFullYear()} ${BRAND_NAME}. All rights reserved.</p>
    </div>
  </div>
`;

const sendEmail = async (to, subject, html, useWrapper = true) => {
  try {
    const resend = getResendClient();
    if (!resend) {
      console.warn(
        `[Resend] RESEND_API_KEY not configured. Skipping email "${subject}" to ${to}`
      );
      return null;
    }

    const fromName = process.env.RESEND_FROM_NAME || BRAND_NAME;
    const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@odogwuhoward.com";

    const response = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to,
      subject,
      html: useWrapper ? emailWrapper(html) : html,
    });
    return response;
  } catch (error) {
    console.error("Resend Email Error:", error);
    return null;
  }
};

const emailServices = {
  sendWelcome: async (email, name) => {
    const html = `
      <h2 style="color: ${SECONDARY_COLOR};">Welcome to the Inner Circle, ${name}!</h2>
      <p>Thank you for registering at <strong>${BRAND_NAME}</strong>. We are thrilled to have you with us.</p>
      <p>Explore exclusive digital music downloads, official Wizolingo merch, upcoming tour dates, and more.</p>
      <div style="margin-top: 24px;">
        <a href="${FRONTEND_URL}" style="background: ${BRAND_COLOR}; color: #ffffff; padding: 12px 26px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Explore Store &amp; Music</a>
      </div>
    `;
    await sendEmail(email, `Welcome to ${BRAND_NAME}`, html);
  },

  sendOTP: async (email, otp) => {
    const html = `
      <h2 style="color: ${SECONDARY_COLOR};">Verify Your Email</h2>
      <p>Use the verification code below to complete your action. This code is valid for 10 minutes.</p>
      <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: ${BRAND_COLOR}; border-radius: 5px; margin: 20px 0;">
        ${otp}
      </div>
      <p>If you didn't request this, please ignore this email.</p>
    `;
    await sendEmail(email, "Your Verification Code", html);
  },

  sendAdminOTP: async (email, otp) => {
    const html = `
      <h2 style="color: ${SECONDARY_COLOR};">Admin Authentication Code</h2>
      <p>An admin sign-in attempt was initiated for your <strong>Wizolingo Admin</strong> account. Enter the OTP below within 5 minutes:</p>
      <div style="background: #141414; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: ${BRAND_COLOR}; border-radius: 5px; margin: 20px 0;">
        ${otp}
      </div>
      <p style="color: #666666; font-size: 13px;">If you did not attempt to sign in, please reset your password immediately.</p>
    `;
    await sendEmail(email, "Wizolingo Admin Login OTP", html);
  },

  sendPasswordReset: async (email, token) => {
    const resetLink = `${FRONTEND_URL}/reset-password/${token}`;
    const html = `
      <h2 style="color: ${SECONDARY_COLOR};">Password Reset Request</h2>
      <p>We received a request to reset your password. Click the button below to set a new one:</p>
      <div style="margin: 30px 0; text-align: center;">
        <a href="${resetLink}" style="background: ${BRAND_COLOR}; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reset Password</a>
      </div>
      <p>If you did not request this, your password will remain unchanged. This link expires in 1 hour.</p>
      <p style="font-size: 12px; color: #999999;">If the button above doesn't work, copy and paste this link into your browser:<br>${resetLink}</p>
    `;
    await sendEmail(email, "Reset Your Password", html);
  },

  sendOrderConfirmation: async (email, order) => {
    const hasDigital = order.orderType === "digital" || order.orderType === "mixed";
    const digitalNote = hasDigital
      ? `<p><strong>Digital Downloads:</strong> Once payment is confirmed, your music downloads will be unlocked in your account library.</p>`
      : "";

    const html = `
      <h2 style="color: ${SECONDARY_COLOR};">Order Received!</h2>
      <p>Thank you for supporting <strong>Wiz Ofuasia (Wizboyy)</strong>. Your order <strong>#${order._id}</strong> has been created.</p>
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Order Type:</strong> ${order.orderType}</p>
        <p style="margin: 5px 0;"><strong>Total Amount:</strong> $${Number(order.amount || 0).toFixed(2)} ${order.currency || "USD"}</p>
        <p style="margin: 5px 0;"><strong>Status:</strong> ${order.status}</p>
      </div>
      ${digitalNote}
      <p>We will notify you on every update!</p>
    `;
    await sendEmail(email, "Order Confirmation — Wizolingo", html);
  },

  sendAdminOrderNotification: async (order) => {
    if (!process.env.RESEND_TO_EMAIL) return;
    const html = `
      <h2 style="color: ${SECONDARY_COLOR};">New Order Received</h2>
      <p>A new order has been placed on the Wizolingo store.</p>
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Customer Email:</strong> ${order.email}</p>
        <p style="margin: 5px 0;"><strong>Order ID:</strong> ${order._id}</p>
        <p style="margin: 5px 0;"><strong>Order Type:</strong> ${order.orderType}</p>
        <p style="margin: 5px 0;"><strong>Total Amount:</strong> $${Number(order.amount || 0).toFixed(2)} ${order.currency || "USD"}</p>
      </div>
      <a href="${ADMIN_FRONTEND_URL}/orders" style="color: ${BRAND_COLOR}; font-weight: bold;">View Order in Admin Dashboard</a>
    `;
    await sendEmail(process.env.RESEND_TO_EMAIL, "New Wizolingo Order Alert!", html);
  },

  sendOrderStatusUpdate: async (email, status, orderId, downloadUnlocked = false) => {
    const downloadNote = downloadUnlocked
      ? `<p style="color: #16a34a; font-weight: bold;">Your digital music downloads are now unlocked! Visit your Downloads library in your account to download your files.</p>`
      : "";

    const html = `
      <h2 style="color: ${SECONDARY_COLOR};">Order Update</h2>
      <p>The status of your order <strong>#${orderId}</strong> has been updated:</p>
      <div style="margin: 20px 0; padding: 15px; background-color: #f4f4f4; border-left: 4px solid ${BRAND_COLOR};">
        <p style="margin: 0; font-size: 18px;">New Status: <strong>${status}</strong></p>
      </div>
      ${downloadNote}
      <p>Log in to your account to view full details.</p>
    `;
    await sendEmail(email, "Update on your Wizolingo Order", html);
  },

  sendNewsletterWelcome: async (email, unsubscribeToken) => {
    const unsubscribeLink = `${FRONTEND_URL}/newsletter/unsubscribe?token=${unsubscribeToken}`;
    const html = `
      <h2 style="color: ${SECONDARY_COLOR};">You're in the Inner Circle!</h2>
      <p>Thank you for subscribing to the official <strong>Wiz Ofuasia (Wizboyy)</strong> newsletter.</p>
      <p>You'll be the first to hear about new digital music drops, exclusive merch releases, tour dates, and behind-the-scenes updates.</p>
      <div style="margin-top: 24px;">
        <a href="${FRONTEND_URL}/songs" style="background: ${BRAND_COLOR}; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Listen &amp; Explore</a>
      </div>
      <p style="margin-top: 24px; font-size: 11px; color: #888888;">
        Don't want to receive these emails? <a href="${unsubscribeLink}" style="color: #888888;">Unsubscribe here</a>.
      </p>
    `;
    await sendEmail(email, "Welcome to Wiz Ofuasia's Inner Circle", html);
  },

  sendNewsletterCampaign: async (email, subject, htmlContent, unsubscribeToken) => {
    const unsubscribeLink = `${FRONTEND_URL}/newsletter/unsubscribe?token=${unsubscribeToken}`;
    const footerHtml = `
      ${htmlContent}
      <p style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #eeeeee; font-size: 11px; color: #888888; text-align: center;">
        You received this email because you subscribed to Wiz Ofuasia (Wizboyy) updates.
        <br />
        <a href="${unsubscribeLink}" style="color: #888888;">Unsubscribe</a>
      </p>
    `;
    return sendEmail(email, subject, footerHtml, true);
  },

  sendTicketConfirmation: async (email, ticketOrder, event) => {
    const html = `
      <h2 style="color: ${SECONDARY_COLOR};">Event Ticket Order Received!</h2>
      <p>Hi <strong>${ticketOrder.attendeeName}</strong>, your ticket reservation for <strong>${event.title}</strong> has been created.</p>
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Ticket Code:</strong> ${ticketOrder.ticketCode}</p>
        <p style="margin: 5px 0;"><strong>Venue:</strong> ${event.venue}, ${event.location}</p>
        <p style="margin: 5px 0;"><strong>Date &amp; Time:</strong> ${event.dateLabel || new Date(event.startDate).toDateString()} ${event.time ? `at ${event.time}` : ""}</p>
        <p style="margin: 5px 0;"><strong>Total Amount:</strong> $${Number(ticketOrder.totalAmount || 0).toFixed(2)} ${ticketOrder.currency}</p>
        <p style="margin: 5px 0;"><strong>Status:</strong> ${ticketOrder.status}</p>
      </div>
      <p>Present your Ticket Code at the venue once payment is confirmed.</p>
    `;
    await sendEmail(email, `Ticket Reservation: ${event.title}`, html);
  },

  sendAdminTicketNotification: async (ticketOrder, event) => {
    if (!process.env.RESEND_TO_EMAIL) return;
    const html = `
      <h2 style="color: ${SECONDARY_COLOR};">New Event Ticket Sale</h2>
      <p>A new ticket order was placed for <strong>${event.title}</strong>.</p>
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Attendee:</strong> ${ticketOrder.attendeeName} (${ticketOrder.email})</p>
        <p style="margin: 5px 0;"><strong>Ticket Code:</strong> ${ticketOrder.ticketCode}</p>
        <p style="margin: 5px 0;"><strong>Total Amount:</strong> $${Number(ticketOrder.totalAmount || 0).toFixed(2)} ${ticketOrder.currency}</p>
      </div>
      <a href="${ADMIN_FRONTEND_URL}/events" style="color: ${BRAND_COLOR}; font-weight: bold;">View Ticket Sales in Admin Dashboard</a>
    `;
    await sendEmail(process.env.RESEND_TO_EMAIL, `New Ticket Sale: ${event.title}`, html);
  },
};

module.exports = emailServices;

