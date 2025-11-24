import React, { useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Login from "./Login";
import Manager from "./Manager";

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [masterPassword, setMasterPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = (pw) => {
    setMasterPassword(pw);
    setLoggedIn(true);
    navigate("/manager");
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          loggedIn ? (
            <Manager masterPassword={masterPassword} />
          ) : (
            <Login onLogin={handleLogin} />
          )
        }
      />

      <Route
        path="/manager"
        element={
          loggedIn ? (
            <Manager masterPassword={masterPassword} />
          ) : (
            <Login onLogin={handleLogin} />
          )
        }
      />

      <Route
        path="*"
        element={<Login onLogin={handleLogin} />}
      />
    </Routes>
  );
}

export default App;
