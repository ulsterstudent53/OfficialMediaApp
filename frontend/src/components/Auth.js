import React, { useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:7071/api";

export default function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
    role: "consumer",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isLogin ? "/login" : "/signup";
    try {
      const { data } = await axios.post(API_URL + endpoint, formData);
      localStorage.setItem("user", JSON.stringify(data.user || data));
      onLogin(data.user || data);
    } catch (err) {
      alert("Auth failed: " + err.response?.data?.error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="p-8 bg-white rounded-lg shadow-xl w-96"
      >
        <h2 className="mb-6 text-3xl font-bold text-center text-blue-600">
          {isLogin ? "Login" : "Signup"}
        </h2>
        {!isLogin && (
          <>
            <input
              className="w-full p-2 mb-4 border rounded"
              placeholder="Username"
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
            />
            <select
              className="w-full p-2 mb-4 border rounded"
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value })
              }
            >
              <option value="consumer">Consumer</option>
              <option value="creator">Creator</option>
            </select>
          </>
        )}
        <input
          className="w-full p-2 mb-4 border rounded"
          placeholder="Email"
          type="email"
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
        <input
          className="w-full p-2 mb-4 border rounded"
          placeholder="Password"
          type="password"
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
        />
        <button className="w-full py-2 text-white bg-blue-600 rounded hover:bg-blue-700 transition font-semibold">
          {isLogin ? "Sign In" : "Register Account"}
        </button>
        <p
          className="mt-4 text-center cursor-pointer text-sm text-gray-500 underline"
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin
            ? "Need an account? Signup"
            : "Already have an account? Login"}
        </p>
      </form>
    </div>
  );
}
