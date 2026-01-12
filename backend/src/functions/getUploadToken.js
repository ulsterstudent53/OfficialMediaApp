const { app } = require("@azure/functions");
const {
  BlobServiceClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  StorageSharedKeyCredential,
} = require("@azure/storage-blob");

// Initialize Storage Credentials
const accountName = process.env.StorageAccountName;
const accountKey = process.env.StorageAccountKey;
const sharedKeyCredential = new StorageSharedKeyCredential(
  accountName,
  accountKey
);

app.http("getUploadToken", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    try {
      const blobName =
        request.query.get("blobName") || `image-${Date.now()}.jpg`;
      const containerName = "images"; // Ensure this matches your Azure container name

      // Set the "pass" to expire in 10 minutes
      const expiryTime = new Date();
      expiryTime.setMinutes(expiryTime.getMinutes() + 10);

      const sasToken = generateBlobSASQueryParameters(
        {
          containerName,
          blobName,
          permissions: BlobSASPermissions.parse("w"), // "w" means Write only
          expiresOn: expiryTime,
        },
        sharedKeyCredential
      ).toString();

      const uploadUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}?${sasToken}`;

      return { status: 200, jsonBody: { uploadUrl, blobName } };
    } catch (error) {
      return { status: 500, jsonBody: { error: error.message } };
    }
  },
});
