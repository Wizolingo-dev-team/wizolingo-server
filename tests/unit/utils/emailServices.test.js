// tests/unit/utils/emailServices.test.js
const { Resend } = require("resend");

describe("utils/emailServices", () => {
  const originalKey = process.env.RESEND_API_KEY;

  afterEach(() => {
    process.env.RESEND_API_KEY = originalKey;
    vi.restoreAllMocks();
  });

  it("skips sending gracefully when RESEND_API_KEY is not configured", async () => {
    delete process.env.RESEND_API_KEY;
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const emailServices = require("../../../utils/emailServices");

    await expect(
      emailServices.sendWelcome("fan@example.com", "WizFan")
    ).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("sends all branded email templates when RESEND_API_KEY is configured", async () => {
    process.env.RESEND_API_KEY = "re_test_123";
    const dummy = new Resend("re_dummy");
    const emailsProto = Object.getPrototypeOf(dummy.emails);
    const sendSpy = vi
      .spyOn(emailsProto, "send")
      .mockResolvedValue({ id: "email_123" });

    const emailServices = require("../../../utils/emailServices");

    await emailServices.sendWelcome("fan@example.com", "WizFan");
    await emailServices.sendOTP("fan@example.com", "123456");
    await emailServices.sendAdminOTP("admin@wizofuasia.com", "654321");
    await emailServices.sendPasswordReset("fan@example.com", "reset-tok");
    await emailServices.sendOrderConfirmation("fan@example.com", {
      _id: "ord1",
      orderType: "digital",
      amount: 25,
      currency: "USD",
      status: "Processing",
    });
    await emailServices.sendAdminOrderNotification({
      _id: "ord1",
      email: "fan@example.com",
      orderType: "merch",
      amount: 50,
      currency: "USD",
    });
    await emailServices.sendOrderStatusUpdate(
      "fan@example.com",
      "Payment Confirmed",
      "ord1",
      true
    );
    await emailServices.sendNewsletterWelcome("fan@example.com", "unsub-tok");
    await emailServices.sendNewsletterCampaign(
      "fan@example.com",
      "New Single Out Now",
      "<p>Listen now!</p>",
      "unsub-tok"
    );
    await emailServices.sendTicketConfirmation(
      "fan@example.com",
      {
        attendeeName: "WizFan",
        ticketCode: "WIZ-TKT-1234",
        totalAmount: 40,
        currency: "USD",
        status: "Processing",
      },
      {
        title: "London Live",
        venue: "O2",
        location: "London",
        startDate: new Date(),
        time: "9 PM",
      }
    );
    await emailServices.sendAdminTicketNotification(
      {
        attendeeName: "WizFan",
        email: "fan@example.com",
        ticketCode: "WIZ-TKT-1234",
        totalAmount: 40,
        currency: "USD",
      },
      { title: "London Live" }
    );

    expect(sendSpy).toHaveBeenCalledTimes(11);
    const firstCall = sendSpy.mock.calls[0][0];
    expect(firstCall.html).toContain("Wiz Ofuasia (Wizboyy)");
  });
});
