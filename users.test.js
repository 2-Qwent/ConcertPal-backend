const request = require("supertest");
const app = require("./app");
require("./models/connection");

it("POST /signup", async () => {
  const res = await request(app).post("/users/signup").send({
    username: "johndoe",
    email: "johndoe@gmail.com",
    password: "password123",
  });

  expect(res.statusCode).toBe(200);
  expect(res.body.result).toBe(true);
  expect(res.body.token).toBeDefined();
});

it("POST /signin", async () => {
  const res = await request(app).post("/users/signin").send({
    username: "johndoe",
    password: "password123",
  });

  expect(res.statusCode).toBe(200);
  expect(res.body.result).toBe(true);
  expect(res.body.token).toBeDefined();
});
