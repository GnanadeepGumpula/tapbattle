"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Plus,
  History,
  LogOut,
  Calendar,
  Users,
  Trophy,
  Trash2,
  AlertTriangle,
  Download,
  AlertCircle,
} from "lucide-react"
import api from "../services/api"
import StatisticsDashboard from "../components/StatisticsDashboard"
import dataExportService from "../services/dataExport"

const HostDashboard = () => {
  const navigate = useNavigate()
  const [hostUser, setHostUser] = useState("")
  const [previousSessions, setPreviousSessions] = useState([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    const user = localStorage.getItem("hostUser")
    if (!user) {
      navigate("/host-login")
      return
    }
    setHostUser(user)
    loadSessions(user)
  }, [navigate])

  const loadSessions = async (username) => {
    try {
      const response = await api.getHostSessions(username)
      if (response.success) {
        setPreviousSessions(response.sessions)
      } else {
        console.error("Error loading sessions:", response.error)
      }
    } catch (error) {
      console.error("Error loading sessions:", error)
    }
    setLoading(false)
  }

  const handleLogout = () => {
    localStorage.removeItem("hostUser")
    navigate("/")
  }

  const handleDeleteAccount = async () => {
    try {
      setDeleting(true)
      console.log("Starting complete account deletion process...")

      const progressSteps = [
        "Finding all your sessions...",
        "Deleting session data...",
        "Removing teams and players...",
        "Clearing tap records...",
        "Deleting your account...",
        "Final cleanup...",
      ]

      for (let i = 0; i < progressSteps.length; i++) {
        console.log(progressSteps[i])
        await new Promise((resolve) => setTimeout(resolve, 800))
      }

      const response = await api.deleteHost(hostUser)
      if (response.success) {
        console.log("Account and ALL related data deleted successfully")
        localStorage.removeItem("hostUser")
        alert("Your account and all related data have been completely deleted.")
        navigate("/")
      } else {
        throw new Error(response.error || "Failed to delete account")
      }
    } catch (error) {
      console.error("Error deleting account:", error)
      alert("Failed to delete account completely. Some data may remain. Please contact support.")
      setDeleting(false)
    }
  }

  const createNewSession = () => {
    const sessionId = Math.random().toString(36).substr(2, 6).toUpperCase()
    navigate(`/host-interface/${sessionId}`)
  }

  const openPreviousSession = (sessionId) => {
    navigate(`/host-interface/${sessionId}`)
  }

  const deleteSession = async (sessionId) => {
    try {
      setDeleting(true)
      console.log(`Starting deletion of session: ${sessionId}`)

      const progressSteps = [
        "Deleting tap records...",
        "Removing players...",
        "Deleting teams...",
        "Removing session...",
        "Cleaning up...",
      ]

      for (let i = 0; i < progressSteps.length; i++) {
        console.log(progressSteps[i])
        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      const response = await api.deleteSession(sessionId)
      if (response.success) {
        console.log(`Session ${sessionId} and ALL related data deleted successfully`)
        await loadSessions(hostUser)
        setShowDeleteConfirm(null)
        setDeleting(false)
        alert(`Session ${sessionId} and all related data have been completely deleted.`)
      } else {
        throw new Error(response.error || "Failed to delete session")
      }
    } catch (error) {
      console.error("Error deleting session:", error)
      alert("Failed to delete session completely. Some data may remain. Please try again.")
      setDeleting(false)
    }
  }

  const confirmDelete = (sessionId) => {
    setShowDeleteConfirm(sessionId)
  }

  const handleExportData = async () => {
    try {
      setLoading(true)
      await dataExportService.exportHostStatistics(hostUser)
    } catch (error) {
      console.error("Error exporting data:", error)
      alert("Failed to export data. Please try again.")
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-row items-center justify-between mb-6 sm:mb-8 space-x-2 sm:space-x-4">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">Host Dashboard</h1>
            <p className="text-gray-600 text-xs sm:text-sm">Welcome, {hostUser}!</p>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={() => setShowDeleteAccount(true)}
              className="flex items-center text-red-600 hover:text-red-800 transition-colors text-xs sm:text-sm py-1 px-2 sm:px-3 rounded-md"
              disabled={deleting}
            >
              <Trash2 className="w-4 h-4 mr-1 sm:mr-2" />
              Delete
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center text-gray-600 hover:text-gray-800 transition-colors text-xs sm:text-sm py-1 px-2 sm:px-3 rounded-md"
            >
              <LogOut className="w-4 h-4 mr-1 sm:mr-2" />
              Logout
            </button>
          </div>
        </div>

        {/* Storage Management Message */}
        <div className="card mb-6 sm:mb-8 bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-500">
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2">💾 Smart Storage Management</h3>
              <p className="text-gray-700 mb-2 text-sm sm:text-base">
                <strong>"Clean Data, Clear Mind - Optimize Your Storage, Maximize Your Performance!"</strong>
              </p>
              <p className="text-xs sm:text-sm text-gray-600">
                Regularly delete unused sessions and player data to maintain optimal performance. Clean storage means
                faster loading times and better user experience.
                <span className="font-medium text-blue-600"> Remember: Organized data = Organized success!</span>
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6 sm:mb-8 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex-1 py-2 px-3 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-colors ${
              activeTab === "overview" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("statistics")}
            className={`flex-1 py-2 px-3 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-colors ${
              activeTab === "statistics" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Statistics
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <>
            <div className="grid md:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
              <div
                className="card hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-2"
                onClick={createNewSession}
              >
                <div className="text-center">
                  <Plus className="w-12 h-12 sm:w-16 sm:h-16 text-blue-600 mx-auto mb-4" />
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Create New Session</h2>
                  <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">Start a fresh quiz session with a new joining code</p>
                  <button className="btn-primary w-full text-sm sm:text-base py-2 sm:py-3">Create Session</button>
                </div>
              </div>

              <div className="card">
                <div className="text-center">
                  <History className="w-12 h-12 sm:w-16 sm:h-16 text-teal-600 mx-auto mb-4" />
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Previous Sessions</h2>
                  <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">Continue with your existing sessions</p>
                  {previousSessions.length > 0 ? (
                    <div className="space-y-2">
                      {previousSessions.slice(0, 3).map((session) => (
                        <div
                          key={session.sessionId}
                          className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <button onClick={() => openPreviousSession(session.sessionId)} className="flex-1 text-left">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-sm sm:text-base">{session.sessionId}</span>
                              <span className="text-xs sm:text-sm text-gray-500">Round {session.round}</span>
                            </div>
                          </button>
                          <button
                            onClick={() => confirmDelete(session.sessionId)}
                            className="p-2 text-red-600 hover:text-red-800 transition-colors ml-2"
                            disabled={deleting}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {previousSessions.length > 3 && (
                        <p className="text-xs sm:text-sm text-gray-500 mt-2">+{previousSessions.length - 3} more sessions</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic text-sm sm:text-base">No previous sessions found</p>
                  )}
                </div>
              </div>
            </div>

            {/* All Sessions List */}
            {previousSessions.length > 0 && (
              <div className="card">
                <div className="flex flex-col sm:flex-row items-center justify-between mb-4 sm:mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 sm:mb-0">All Sessions</h2>
                  <button
                    onClick={handleExportData}
                    className="flex items-center px-3 py-2 sm:px-4 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base"
                    disabled={loading}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Data
                  </button>
                </div>
                <div className="grid gap-3">
                  {previousSessions.map((session) => (
                    <div
                      key={session.sessionId}
                      className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="font-bold text-blue-600 text-sm sm:text-base">{session.sessionId}</span>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800 text-sm sm:text-base">Session {session.sessionId}</div>
                          <div className="text-xs sm:text-sm text-gray-600">
                            Created: {new Date(session.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-600">
                            Round: {session.round} | Mode: {session.playerMode}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openPreviousSession(session.sessionId)}
                          className="btn-secondary text-xs sm:text-sm px-3 py-2 sm:px-4 sm:py-2"
                        >
                          Open
                        </button>
                        <button
                          onClick={() => confirmDelete(session.sessionId)}
                          className="p-2 text-red-600 hover:text-red-800 transition-colors"
                          disabled={deleting}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-3 gap-4 sm:gap-6 mt-6 sm:mt-8">
              <div className="card text-center">
                <Calendar className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">Sessions Created</h3>
                <p className="text-2xl sm:text-3xl font-bold text-blue-600">{previousSessions.length}</p>
              </div>
              <div className="card text-center">
                <Users className="w-10 h-10 sm:w-12 sm:h-12 text-teal-600 mx-auto mb-4" />
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">Active Sessions</h3>
                <p className="text-2xl sm:text-3xl font-bold text-teal-600">{previousSessions.filter((s) => s.active).length}</p>
              </div>
              <div className="card text-center">
                <Trophy className="w-10 h-10 sm:w-12 sm:h-12 text-orange-600 mx-auto mb-4" />
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">Total Rounds</h3>
                <p className="text-2xl sm:text-3xl font-bold text-orange-600">
                  {previousSessions.reduce((total, session) => total + (session.round || 1), 0)}
                </p>
              </div>
            </div>
          </>
        )}

        {activeTab === "statistics" && <StatisticsDashboard hostUsername={hostUser} sessions={previousSessions} />}

        {/* Delete Session Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="card max-w-md w-full">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Delete Session</h3>
              <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">
                Are you sure you want to delete session <strong>{showDeleteConfirm}</strong>? This action cannot be
                undone and will remove all associated data including players and tap records.
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={() => deleteSession(showDeleteConfirm)}
                  className="btn-accent flex-1 text-sm sm:text-base py-2 sm:py-3"
                  disabled={deleting}
                >
                  {deleting ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Deleting...
                    </div>
                  ) : (
                    "Delete"
                  )}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 py-2 sm:py-3 px-4 sm:px-6 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors text-sm sm:text-base"
                  disabled={deleting}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Account Confirmation Modal */}
        {showDeleteAccount && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="card max-w-md w-full">
              <div className="flex items-center mb-4">
                <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-red-600 mr-3" />
                <h3 className="text-lg sm:text-xl font-bold text-gray-800">Delete Account</h3>
              </div>
              <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">
                Are you sure you want to delete your account <strong>{hostUser}</strong>? This action cannot be undone
                and will permanently remove:
              </p>
              <ul className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6 space-y-1">
                <li>• Your host account</li>
                <li>• All your sessions ({previousSessions.length} sessions)</li>
                <li>• All player data from your sessions</li>
                <li>• All tap records and game history</li>
              </ul>
              <div className="flex space-x-4">
                <button onClick={handleDeleteAccount} className="btn-accent flex-1 text-sm sm:text-base py-2 sm:py-3" disabled={deleting}>
                  {deleting ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Deleting Account...
                    </div>
                  ) : (
                    "Delete Account"
                  )}
                </button>
                <button
                  onClick={() => setShowDeleteAccount(false)}
                  className="flex-1 py-2 sm:py-3 px-4 sm:px-6 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors text-sm sm:text-base"
                  disabled={deleting}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default HostDashboard