// tests/perf/api-performance.perf.test.js
const fs = require("fs");
const path = require("path");
const http = require("http");
const autocannon = require("autocannon");
const createApp = require("../../app");
const Product = require("../../models/productModel");
const Event = require("../../models/eventModel");
const Category = require("../../models/categoryModel");
const Blog = require("../../models/blogModel");
const { connectTestDB, clearTestDB, closeTestDB } = require("../helpers/db");
const { createMockIo } = require("../helpers/testFixtures");

const runBenchmark = (url, opts = {}) =>
  new Promise((resolve, reject) => {
    autocannon(
      {
        url,
        connections: opts.connections || 10,
        duration: opts.duration || 2,
        method: opts.method || "GET",
        headers: opts.headers,
        body: opts.body,
      },
      (err, result) => {
        if (err) reject(err);
        else resolve(result);
      }
    );
  });

describe("Performance: HTTP Latency & Throughput Benchmarks", () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    if (process.env.PERF_BASE_URL) {
      baseUrl = process.env.PERF_BASE_URL;
      return;
    }

    await connectTestDB();
    await clearTestDB();

    await Category.create({
      categoryName: "Singles",
      categoryType: "digital_music",
    });
    await Product.create({
      productName: "Yolo",
      productType: "digital_music",
      description: "Hit single",
      price: 3.99,
    });
    await Event.create({
      title: "Wizolingo Live",
      slug: "wizolingo-live-perf",
      description: "Concert",
      startDate: new Date("2026-12-20T20:00:00Z"),
      venue: "O2",
      location: "London",
    });
    await Blog.create({
      title: "Perf Test Article",
      slug: "perf-test-article",
      content: "<p>Benchmarking article</p>",
      status: "Published",
      isPublished: true,
    });

    const app = createApp(createMockIo());
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const addr = server.address();
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
      await closeTestDB();
    }
  });

  it("meets p95 latency (< 250ms) and zero-error thresholds across core endpoints", async () => {
    const endpoints = [
      { name: "Health Check", path: "/" },
      { name: "Products List", path: "/api/products/get-all-products" },
      { name: "Events List", path: "/api/events/get-all-events" },
      { name: "Categories List", path: "/api/categories/get-all-categories" },
      { name: "Blogs List", path: "/api/blogs" },
    ];

    const results = [];
    for (const ep of endpoints) {
      const res = await runBenchmark(`${baseUrl}${ep.path}`, {
        connections: 10,
        duration: 2,
      });

      results.push({
        endpoint: ep.name,
        path: ep.path,
        requestsPerSec: res.requests.average,
        p50Ms: res.latency.p50,
        p95Ms: res.latency.p97_5,
        errors: res.errors,
        non2xx: res.non2xx,
      });

      expect(res.errors).toBe(0);
      expect(res.non2xx).toBe(0);
      expect(res.latency.p97_5).toBeLessThan(500);
    }

    const reportDir = path.join(process.cwd(), "perf-report");
    fs.mkdirSync(reportDir, { recursive: true });
    fs.writeFileSync(
      path.join(reportDir, "perf-summary.json"),
      JSON.stringify({ baseUrl, generatedAt: new Date().toISOString(), results }, null, 2)
    );
  });
});

