"use client"

import { useEffect } from "react"
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { displayEnvironmentStatus } from "./utils/envChecker"
import ErrorBoundary from "./components/ErrorBoundary"
import { ThemeProvider } from "./contexts/ThemeContext"
import HomePage from "./pages/HomePage"
import JoinPage from "./pages/JoinPage"
import HostLoginPage from "./pages/HostLoginPage"
import HostDashboard from "./pages/HostDashboard"
import HostInterface from "./pages/HostInterface"
import UserGamePage from "./pages/UserGamePage"
import "./App.css"

function App() {
  useEffect(() => {
    // Check environment variables on app start
    if (process.env.NODE_ENV === "development") {
      console.log("🔧 TapBattle - Development Mode")
      displayEnvironmentStatus()
    }
  }, [])

  return (
    <ThemeProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/join" element={<JoinPage />} />
            <Route path="/join/:sessionId" element={<JoinPage />} />
            <Route path="/host-login" element={<HostLoginPage />} />
            <Route path="/host-dashboard" element={<HostDashboard />} />
            <Route path="/host-interface/:sessionId" element={<HostInterface />} />
            <Route path="/game/:sessionId" element={<UserGamePage />} />
            <Route path="*" element={<div>Not-Found</div>} />
          </Routes>
        </ErrorBoundary>
      </Router>
    </ThemeProvider>
  )
}

export default App