// tests/unit/models/eventModel.test.js
const Event = require("../../../models/eventModel");

describe("models/eventModel", () => {
  it("validates event with showTimes, timezone, artists, and ticketTiers", () => {
    const event = new Event({
      title: "Wizolingo Live in London",
      slug: "wizolingo-live-london",
      description: "Live concert",
      startDate: new Date("2026-12-20T20:00:00Z"),
      venue: "O2 Indigo",
      location: "London, UK",
      timezone: "GMT",
      showTimes: [{ time: "8:00 PM", timezone: "GMT", label: "Doors Open" }],
      artists: [
        {
          name: "Wiz Ofuasia",
          stage: "Main stage",
          performanceTime: "10:00 PM",
          timezone: "GMT",
          showTimes: [{ time: "10:00 PM", timezone: "GMT", label: "Headline" }],
        },
      ],
      ticketTiers: [
        { name: "VIP", price: 120, totalQuantity: 100 },
      ],
    });

    expect(event.validateSync()).toBeUndefined();
    expect(event.status).toBe("UPCOMING");
    expect(event.organizedBy).toBe("Wizolingo Music");
    expect(event.ticketTiers[0].soldQuantity).toBe(0);
  });

  it("rejects missing required fields and invalid status", () => {
    const event = new Event({ status: "ARCHIVED" });
    const err = event.validateSync();
    expect(err.errors.title).toBeDefined();
    expect(err.errors.slug).toBeDefined();
    expect(err.errors.venue).toBeDefined();
    expect(err.errors.location).toBeDefined();
    expect(err.errors.status).toBeDefined();
  });
});

