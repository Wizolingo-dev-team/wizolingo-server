// tests/unit/models/newsletterModels.test.js
const NewsletterSubscriber = require("../../../models/newsletterSubscriberModel");
const NewsletterTemplate = require("../../../models/newsletterTemplateModel");

describe("models/newsletterSubscriberModel & newsletterTemplateModel", () => {
  it("creates subscriber with auto-generated unsubscribeToken", () => {
    const sub = new NewsletterSubscriber({ email: "  SUB@Example.com " });
    expect(sub.validateSync()).toBeUndefined();
    expect(sub.email).toBe("sub@example.com");
    expect(sub.status).toBe("subscribed");
    expect(sub.source).toBe("popup");
    expect(sub.unsubscribeToken).toHaveLength(48);
  });

  it("validates newsletter template defaults and enums", () => {
    const tpl = new NewsletterTemplate({
      name: "New Single Drop",
      subject: "Yolo is Out!",
      htmlContent: "<p>Listen now</p>",
      category: "release",
    });
    expect(tpl.validateSync()).toBeUndefined();
    expect(tpl.status).toBe("draft");
    expect(tpl.sentCount).toBe(0);

    const bad = new NewsletterTemplate({ category: "invalid" });
    expect(bad.validateSync().errors.category).toBeDefined();
  });
});

