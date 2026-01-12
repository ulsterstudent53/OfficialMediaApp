import React, { useState, useEffect } from "react";
import axios from "axios";
import { Upload, Heart, MessageCircle, Trash2 } from "lucide-react";

const API_URL = "http://localhost:7071/api";

export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user"));
  const [images, setImages] = useState([]);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchFeed();
  }, []);

  const fetchFeed = async () => {
    const { data } = await axios.get(`${API_URL}/images/feed`);
    setImages(data);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      // 1. Get SAS Token
      const {
        data: { uploadUrl },
      } = await axios.get(`${API_URL}/getUploadToken?blobName=${file.name}`);

      // 2. Upload directly to Blob Storage
      await axios.put(uploadUrl, file, {
        headers: { "x-ms-blob-type": "BlockBlob" },
      });

      // 3. Save to Cosmos DB & Trigger AI
      const cleanUrl = uploadUrl.split("?")[0];
      await axios.post(`${API_URL}/images/upload`, {
        imageUrl: cleanUrl,
        userId: user.id,
        username: user.username,
      });

      setFile(null);
      fetchFeed();
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-extrabold text-gray-800">Media Vault</h1>
        <button
          onClick={() => {
            localStorage.clear();
            window.location.reload();
          }}
          className="text-red-500 font-bold"
        >
          Logout
        </button>
      </div>

      {/* Creator Only: Upload UI */}
      {user.role === "creator" && (
        <div className="mb-12 p-6 bg-blue-50 border-2 border-dashed border-blue-200 rounded-xl text-center">
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            className="mb-4 block mx-auto"
          />
          <button
            onClick={handleUpload}
            disabled={loading}
            className="flex items-center mx-auto bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400"
          >
            <Upload className="mr-2" size={20} />{" "}
            {loading ? "AI Processing..." : "Secure Upload"}
          </button>
        </div>
      )}

      {/* Shared Feed: Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {images.map((img) => (
          <div
            key={img.id}
            className="bg-white rounded-xl shadow-lg overflow-hidden transition transform hover:scale-105"
          >
            <img
              src={img.imageUrl}
              alt="AI Described"
              className="w-full h-64 object-cover"
            />
            <div className="p-4">
              <p className="text-gray-600 italic mb-2 text-sm">
                "{img.description || img.aiGeneratedCaption}"
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {img.tags?.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
              <div className="flex justify-between items-center pt-4 border-t">
                <button className="flex items-center text-pink-500 font-bold">
                  <Heart size={18} className="mr-1" /> {img.likes}
                </button>
                <div className="flex items-center text-gray-500">
                  <MessageCircle size={18} className="mr-1" />{" "}
                  {img.comments?.length}
                </div>
                {user.role === "creator" && (
                  <Trash2 size={18} className="text-red-400 cursor-pointer" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
