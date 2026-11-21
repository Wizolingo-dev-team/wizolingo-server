// tests/unit/config/dbConfig.test.js
const mongoose = require("mongoose");

describe("config/dbConfig", () => {
  it("connects to MONGO_URL and registers connection event handlers", () => {
    const connectSpy = vi
      .spyOn(mongoose, "connect")
      .mockResolvedValueOnce(mongoose);
    const onSpy = vi.spyOn(mongoose.connection, "on");

    process.env.MONGO_URL = "mongodb://127.0.0.1:27017/wizolingo_unit_test";
    delete require.cache[require.resolve("../../../config/dbConfig")];
    const exported = require("../../../config/dbConfig");

    expect(connectSpy).toHaveBeenCalledWith(process.env.MONGO_URL);
    expect(onSpy).toHaveBeenCalledWith("connected", expect.any(Function));
    expect(onSpy).toHaveBeenCalledWith("error", expect.any(Function));
    expect(exported).toBe(mongoose);

    connectSpy.mockRestore();
    onSpy.mockRestore();
  });
});

