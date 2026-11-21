// tests/unit/models/supportingModels.test.js
const mongoose = require("mongoose");
const Category = require("../../../models/categoryModel");
const Discount = require("../../../models/discountModel");
const DeliveryFee = require("../../../models/deliveryFeeModel");
const Wishlist = require("../../../models/wishlistModel");
const Review = require("../../../models/reviewModel");
const Notification = require("../../../models/notificationsModel");
const Activity = require("../../../models/activityModel");

describe("models/supportingModels", () => {
  it("validates Category and subcategories", () => {
    const cat = new Category({
      categoryName: "Apparel",
      categoryType: "merch",
      subcategories: [{ subcategoryName: "Hoodies" }],
    });
    expect(cat.validateSync()).toBeUndefined();
  });

  it("validates Discount uppercase code and percentage bounds", () => {
    const disc = new Discount({
      discountCode: "wiz20",
      discountPercentage: 20,
      expiryDate: new Date(Date.now() + 86400000),
    });
    expect(disc.validateSync()).toBeUndefined();
    expect(disc.discountCode).toBe("WIZ20");

    const invalid = new Discount({
      discountCode: "BAD",
      discountPercentage: 150,
      expiryDate: new Date(),
    });
    expect(invalid.validateSync().errors.discountPercentage).toBeDefined();
  });

  it("validates DeliveryFee lowercase normalization", () => {
    const fee = new DeliveryFee({
      country: " Nigeria ",
      states: [{ state: " Lagos ", fee: 10 }],
    });
    expect(fee.validateSync()).toBeUndefined();
    expect(fee.country).toBe("nigeria");
    expect(fee.states[0].state).toBe("lagos");
  });

  it("validates Wishlist, Review, Notification, and Activity", () => {
    const uid = new mongoose.Types.ObjectId();
    const pid = new mongoose.Types.ObjectId();

    const wishlist = new Wishlist({ user: uid, products: [pid] });
    expect(wishlist.validateSync()).toBeUndefined();

    const review = new Review({
      user: uid,
      product: pid,
      review: "Fire track!",
      rating: 5,
    });
    expect(review.validateSync()).toBeUndefined();

    const badReview = new Review({
      user: uid,
      product: pid,
      review: "Too high",
      rating: 6,
    });
    expect(badReview.validateSync().errors.rating).toBeDefined();

    const notif = new Notification({
      user: uid,
      title: "New Drop",
      description: "Listen now",
      type: "event",
    });
    expect(notif.validateSync()).toBeUndefined();
    expect(notif.read).toBe(false);

    const activity = new Activity({
      user: uid,
      action: "TICKET_PURCHASED",
      details: "Bought 2 VIP tickets",
    });
    expect(activity.validateSync()).toBeUndefined();
  });
});

