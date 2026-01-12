const { app } = require("@azure/functions");
const { CosmosClient } = require("@azure/cosmos");

const cosmosClient = new CosmosClient(process.env.CosmosDbConnectionString);
const container = cosmosClient.database("MediaDB").container("Images");

// --- 1. GET FEED (Consumer/Distributor: View) ---
app.http("getFeed", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "images/feed",
  handler: async (request, context) => {
    try {
      const { resources } = await container.items.readAll().fetchAll();
      return { status: 200, jsonBody: resources };
    } catch (error) {
      return { status: 500, jsonBody: { error: error.message } };
    }
  },
});

// --- 2. UPLOAD IMAGE (Creator: Create) ---
app.http("imageUpload", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "images/upload",
  handler: async (request, context) => {
    const createAIClient =
      require("@azure-rest/ai-vision-image-analysis").default;
    const { AzureKeyCredential } = require("@azure/core-auth");

    // Initialize AI Vision Client
    const visionEndpoint = process.env.VISION_ENDPOINT;
    const visionKey = process.env.VISION_KEY;
    const visionClient = createAIClient(
      visionEndpoint,
      new AzureKeyCredential(visionKey)
    );

    try {
      const body = await request.json();
      const imageUrl = body.imageUrl;

      // --- 1. AI VISION ANALYSIS ---
      const analysis = await visionClient.path("/analyze").post({
        body: { url: imageUrl },
        queryParameters: {
          features: ["Caption", "Tags"],
          language: "en",
        },
        contentType: "application/json",
      });

      const result = analysis.body;
      const aiCaption =
        result.captionResult?.text || "No description generated";
      const aiTags = result.tagsResult?.values.map((t) => t.name) || [];

      // --- 2. SAVE TO COSMOS DB ---
      const { resource } = await container.items.create({
        imageUrl: imageUrl,
        description: body.description || aiCaption, // Use user desc or fallback to AI
        aiGeneratedCaption: aiCaption,
        tags: aiTags,
        creatorId: body.userId,
        creatorName: body.username,
        likes: 0,
        comments: [],
        timestamp: new Date().toISOString(),
      });

      return { status: 201, jsonBody: resource };
    } catch (error) {
      context.error(`Upload error: ${error.message}`);
      return {
        status: 500,
        jsonBody: { error: "Failed to process and save image" },
      };
    }
  },
});

// --- 3. DELETE IMAGE (Creator: Delete) ---
app.http("imageDelete", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  route: "images/{id}",
  handler: async (request, context) => {
    try {
      const id = request.params.id;
      // In Cosmos DB, you usually need the Partition Key (often the same as ID here)
      await container.item(id, id).delete();
      return { status: 200, jsonBody: { message: "Image deleted" } };
    } catch (error) {
      return { status: 500, jsonBody: { error: error.message } };
    }
  },
});

// --- 4. SOCIAL ACTIONS (Consumer: Like/Comment) ---
app.http("imageSocial", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "images/{id}/{action}", // e.g., /api/images/123/like
  handler: async (request, context) => {
    try {
      const id = request.params.id;
      const action = request.params.action;
      const body = await request.json();

      // Fetch the existing item
      const { resource: item } = await container.item(id, id).read();
      if (!item) return { status: 404, jsonBody: { error: "Image not found" } };

      if (action === "like") {
        item.likes = (item.likes || 0) + 1;
      } else if (action === "comment") {
        item.comments.push({
          user: body.username,
          text: body.text,
          date: new Date().toISOString(),
        });
      }

      const { resource: updatedItem } = await container
        .item(id, id)
        .replace(item);
      return { status: 200, jsonBody: updatedItem };
    } catch (error) {
      return { status: 500, jsonBody: { error: error.message } };
    }
  },
});
