import React, { useState } from "react";
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";

function App() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user")));

  return (
    <div className="min-h-screen bg-gray-50">
      {!user ? <Auth onLogin={setUser} /> : <Dashboard />}
    </div>
  );
}

export default App;
