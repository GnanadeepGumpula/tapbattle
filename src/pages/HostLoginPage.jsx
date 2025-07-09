"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, LogIn, UserPlus, User, Lock, AlertCircle } from "lucide-react"
import googleSheetsService from "../services/googleSheets"

const HostLoginPage = () => {
  const navigate = useNavigate()
  const [isSignUp, setIsSignUp] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (isSignUp && formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)

    try {
      await googleSheetsService.initializeSheets()

      if (isSignUp) {
        // Check if username already exists
        const exists = await googleSheetsService.checkHostExists(formData.username)
        if (exists) {
          setError("Username already exists. Please choose a different username.")
          setLoading(false)
          return
        }

        // Create new host
        await googleSheetsService.createHost(formData.username, formData.password)
        localStorage.setItem("hostUser", formData.username)
        navigate("/host-dashboard")
      } else {
        // Validate existing host
        const isValid = await googleSheetsService.validateHost(formData.username, formData.password)
        if (isValid) {
          localStorage.setItem("hostUser", formData.username)
          navigate("/host-dashboard")
        } else {
          setError("Invalid username or password")
        }
      }
    } catch (error) {
      console.error("Authentication error:", error)
      setError(error.message || "Authentication failed. Please try again.")
    }

    setLoading(false)
  }

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (error) setError("") // Clear error when user starts typing
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <button
          onClick={() => navigate("/")}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Home
        </button>

        <div className="card">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              {isSignUp ? <UserPlus className="w-8 h-8 text-white" /> : <LogIn className="w-8 h-8 text-white" />}
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">{isSignUp ? "Create Account" : "Host Login"}</h2>
            <p className="text-gray-600">{isSignUp ? "Join as a quiz host" : "Access your host dashboard"}</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center text-red-800">
                <AlertCircle className="w-5 h-5 mr-2" />
                <span className="font-semibold">Error</span>
              </div>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Username
              </label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="Enter your username"
                value={formData.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Lock className="w-4 h-4 inline mr-2" />
                Password
              </label>
              <input
                type="password"
                required
                className="input-field"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
              />
            </div>

            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Lock className="w-4 h-4 inline mr-2" />
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  className="input-field"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`btn-accent w-full ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {isSignUp ? "Creating Account..." : "Signing In..."}
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  {isSignUp ? "Create Account" : "Sign In"}
                  <LogIn className="w-5 h-5 ml-2" />
                </div>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError("")
                setFormData({ username: "", password: "", confirmPassword: "" })
              }}
              className="text-blue-600 hover:text-blue-800 transition-colors"
            >
              {isSignUp ? "Already have an account? Sign In" : "New user? Create Account"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HostLoginPage
