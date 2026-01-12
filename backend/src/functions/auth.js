const { app } = require("@azure/functions");
const { CosmosClient } = require("@azure/cosmos");
const bcrypt = require("bcrypt");

const client = new CosmosClient(process.env.CosmosDbConnectionString);
const container = client.database("MediaDB").container("Users");

// --- FUNCTION 1: SIGNUP ---
app.http("signup", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    try {
      const body = await request.json();
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(body.password, saltRounds);

      const { resource } = await container.items.create({
        id: body.email,
        username: body.username,
        password: hashedPassword,
        role: body.role,
      });

      return {
        status: 201,
        jsonBody: { message: "User created", id: resource.id },
      };
    } catch (error) {
      return { status: 500, jsonBody: { error: error.message } };
    }
  },
});

// --- FUNCTION 2: LOGIN ---
app.http("login", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    try {
      const body = await request.json();
      const { resource: user } = await container
        .item(body.email, body.email)
        .read();

      if (!user) {
        return { status: 401, jsonBody: { error: "Invalid credentials" } };
      }

      const isMatch = await bcrypt.compare(body.password, user.password);
      if (!isMatch) {
        return { status: 401, jsonBody: { error: "Invalid credentials" } };
      }

      delete user.password;
      return { status: 200, jsonBody: { message: "Login successful", user } };
    } catch (error) {
      return { status: 500, jsonBody: { error: "Login error" } };
    }
  },
});
