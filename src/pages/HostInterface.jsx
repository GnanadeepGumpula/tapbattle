"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  Copy,
  Users,
  RefreshCw,
  Settings,
  Timer,
  Crown,
  User,
  UserPlus,
  Trash2,
  Shield,
  UserMinus,
  Download,
  Plus,
  Edit,
} from "lucide-react"
import googleSheetsService from "../services/googleSheets"
import dataExportService from "../services/dataExport"

const HostInterface = () => {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [tapOrder, setTapOrder] = useState([])
  const [teams, setTeams] = useState([])
  const [players, setPlayers] = useState([])
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [teamPlayersList, setTeamPlayersList] = useState([])
  const [playerMode, setPlayerMode] = useState("both")
  const [showModeSelector, setShowModeSelector] = useState(false)
  const [showPlayerModeChange, setShowPlayerModeChange] = useState(false)
  const [showTeamCreator, setShowTeamCreator] = useState(false)
  const [newTeam, setNewTeam] = useState({ name: "", password: "" })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("taporder")
  const [isDeleting, setIsDeleting] = useState(false)

  // Use refs to track data without causing re-renders
  const lastUpdateRef = useRef(Date.now())
  const intervalRef = useRef(null)

  // Optimized data loading function
  const loadAllData = useCallback(
    async (silent = false) => {
      try {
        const hostUser = localStorage.getItem("hostUser")
        if (!hostUser) {
          navigate("/host-login")
          return
        }

        const sessionData = await googleSheetsService.getSession(sessionId)
        if (!sessionData) {
          if (!silent) setShowModeSelector(true)
          if (!silent) setLoading(false)
          return
        }

        // Only update state if data actually changed
        const currentTime = Date.now()

        // Load all data in parallel
        const [taps, teamsData, playersData] = await Promise.all([
          googleSheetsService.getTapOrder(sessionId, sessionData.round),
          loadTeams(),
          loadPlayers(),
        ])

        // Update session data
        setSession((prevSession) => {
          if (
            !prevSession ||
            prevSession.round !== sessionData.round ||
            prevSession.playerMode !== sessionData.playerMode
          ) {
            return sessionData
          }
          return prevSession
        })

        setPlayerMode(sessionData.playerMode)

        // Update tap order only if changed
        setTapOrder((prevTaps) => {
          if (JSON.stringify(prevTaps) !== JSON.stringify(taps)) {
            return taps
          }
          return prevTaps
        })

        // Update teams only if changed
        setTeams((prevTeams) => {
          if (JSON.stringify(prevTeams) !== JSON.stringify(teamsData)) {
            return teamsData
          }
          return prevTeams
        })

        // Update players only if changed
        setPlayers((prevPlayers) => {
          if (JSON.stringify(prevPlayers) !== JSON.stringify(playersData)) {
            return playersData
          }
          return prevPlayers
        })

        // Update selected team players if a team is selected
        if (selectedTeam) {
          const teamPlayersList = playersData.filter((p) => p.teamId === selectedTeam.teamId)
          setTeamPlayersList((prevList) => {
            if (JSON.stringify(prevList) !== JSON.stringify(teamPlayersList)) {
              return teamPlayersList
            }
            return prevList
          })
        }

        lastUpdateRef.current = currentTime
      } catch (error) {
        console.error("Error loading data:", error)
      }
      if (!silent) setLoading(false)
    },
    [sessionId, selectedTeam, navigate],
  )

  const loadTeams = async () => {
    try {
      const response = await googleSheetsService.makeRequest("/values/Teams!A:E")
      const values = response.values || []
      return values
        .slice(1)
        .filter((row) => row[1] === sessionId)
        .map((row) => ({
          teamId: row[0],
          sessionId: row[1],
          teamName: row[2],
          password: row[3],
          createdBy: row[4] || "host", // Default to "host" if not specified
          createdAt: row[5],
        }))
    } catch (error) {
      console.error("Error loading teams:", error)
      return []
    }
  }

  const loadPlayers = async () => {
    try {
      const response = await googleSheetsService.makeRequest("/values/Players!A:F")
      const values = response.values || []
      return values
        .slice(1)
        .filter((row) => row[1] === sessionId)
        .map((row) => ({
          playerId: row[0],
          sessionId: row[1],
          teamId: row[2],
          playerName: row[3],
          joinMode: row[4],
          createdAt: row[5],
        }))
    } catch (error) {
      console.error("Error loading players:", error)
      return []
    }
  }

  // Initial load
  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  // Silent real-time updates every second
  useEffect(() => {
    if (!loading && !showModeSelector && !isDeleting) {
      intervalRef.current = setInterval(() => {
        loadAllData(true) // Silent update
      }, 1000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [loading, showModeSelector, isDeleting, loadAllData])

  const createSessionWithMode = async (mode) => {
    try {
      const hostUser = localStorage.getItem("hostUser")
      await googleSheetsService.createSession(sessionId, hostUser, mode)

      const newSession = {
        sessionId,
        hostUsername: hostUser,
        playerMode: mode,
        round: 1,
        createdAt: new Date().toISOString(),
        active: true,
      }

      setSession(newSession)
      setPlayerMode(mode)
      setShowModeSelector(false)
      await loadAllData()
    } catch (error) {
      console.error("Error creating session:", error)
      alert("Failed to create session. Please try again.")
    }
  }

  const changePlayerMode = async (newMode) => {
    try {
      setIsDeleting(true)
      await googleSheetsService.updateSessionPlayerMode(sessionId, newMode)

      setSession((prev) => ({ ...prev, playerMode: newMode }))
      setPlayerMode(newMode)
      setShowPlayerModeChange(false)

      await loadAllData()
      setIsDeleting(false)
    } catch (error) {
      console.error("Error changing player mode:", error)
      alert("Failed to change player mode. Please try again.")
      setIsDeleting(false)
    }
  }

  const createTeam = async () => {
    if (!newTeam.name.trim() || !newTeam.password.trim()) {
      alert("Please enter both team name and password")
      return
    }

    try {
      setIsDeleting(true)
      const teamExists = await googleSheetsService.checkTeamExists(sessionId, newTeam.name)
      if (teamExists) {
        alert("Team name already exists. Please choose a different name.")
        setIsDeleting(false)
        return
      }

      await googleSheetsService.createTeam(sessionId, newTeam.name, newTeam.password, "host")
      setNewTeam({ name: "", password: "" })
      setShowTeamCreator(false)
      await loadAllData()
      setIsDeleting(false)
    } catch (error) {
      console.error("Error creating team:", error)
      alert("Failed to create team. Please try again.")
      setIsDeleting(false)
    }
  }

  const refreshRound = async () => {
    try {
      setIsDeleting(true) // Pause updates during round change

      const newRound = session.round + 1

      // Clear ALL tap order data for this session first
      await googleSheetsService.clearTapOrder(sessionId, session.round)

      // Then update the round
      await googleSheetsService.updateSessionRound(sessionId, newRound)

      // Update local state immediately
      setSession((prev) => ({ ...prev, round: newRound }))
      setTapOrder([])

      // Force refresh all data after a short delay
      setTimeout(async () => {
        await loadAllData()
        setIsDeleting(false)
      }, 2000)
    } catch (error) {
      console.error("Error refreshing round:", error)
      alert("Failed to start new round. Please try again.")
      setIsDeleting(false)
    }
  }

  const copyJoiningCode = () => {
    navigator.clipboard.writeText(sessionId)
    alert("Joining code copied to clipboard!")
  }

  const handleExportSession = async () => {
    try {
      await dataExportService.exportSessionData(sessionId)
    } catch (error) {
      alert("Failed to export session data. Please try again.")
    }
  }

  const handleDeleteTeam = async (teamId) => {
    if (!confirm("Are you sure you want to delete this team? All team members will be removed.")) {
      return
    }

    try {
      setIsDeleting(true)
      console.log(`Deleting team: ${teamId}`)

      // First delete all players in this team
      console.log("Removing all team members...")
      await googleSheetsService.deleteRowsByColumn("Players", "C", teamId)

      // Then delete the team itself
      console.log("Deleting team record...")
      await googleSheetsService.deleteRowsByColumn("Teams", "A", teamId)

      if (selectedTeam?.teamId === teamId) {
        setSelectedTeam(null)
        setTeamPlayersList([])
      }

      console.log(`Team ${teamId} and all members deleted successfully`)
      await loadAllData()
      setIsDeleting(false)

      alert("Team and all members have been completely deleted.")
    } catch (error) {
      console.error("Error deleting team:", error)
      alert("Failed to delete team completely. Please try again.")
      setIsDeleting(false)
    }
  }

  const handleRemovePlayer = async (playerId) => {
    if (!confirm("Are you sure you want to remove this player?")) {
      return
    }

    try {
      setIsDeleting(true)
      console.log(`Removing player: ${playerId}`)

      // Delete the player record
      await googleSheetsService.deleteRowsByColumn("Players", "A", playerId)

      // Also remove any tap records for this player in current session
      console.log("Cleaning up player's tap records...")
      const response = await googleSheetsService.makeRequest("/values/TapOrder!A:G")
      const values = response.values || []

      // Find and delete tap records for this player in this session
      for (let i = 1; i < values.length; i++) {
        const row = values[i]
        if (row[1] === sessionId && row[0].includes(playerId.split("_")[1])) {
          // This is a tap record for this player in this session
          await googleSheetsService.deleteRowsByColumn("TapOrder", "A", row[0])
        }
      }

      console.log(`Player ${playerId} and tap records removed successfully`)
      await loadAllData()
      setIsDeleting(false)

      alert("Player has been completely removed.")
    } catch (error) {
      console.error("Error removing player:", error)
      alert("Failed to remove player completely. Please try again.")
      setIsDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session...</p>
        </div>
      </div>
    )
  }

  if (showModeSelector) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="card text-center">
            <Settings className="w-16 h-16 text-blue-600 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Configure Player Mode</h2>
            <p className="text-gray-600 mb-8">Choose how participants can join your session</p>

            <div className="grid gap-4">
              <button
                onClick={() => createSessionWithMode("single")}
                className="p-6 bg-blue-50 hover:bg-blue-100 rounded-xl border-2 border-blue-200 hover:border-blue-300 transition-all"
              >
                <User className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-blue-800 mb-2">Single Players</h3>
                <p className="text-blue-600">Individual participants only</p>
              </button>

              <button
                onClick={() => createSessionWithMode("teams")}
                className="p-6 bg-teal-50 hover:bg-teal-100 rounded-xl border-2 border-teal-200 hover:border-teal-300 transition-all"
              >
                <Users className="w-8 h-8 text-teal-600 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-teal-800 mb-2">Teams Only</h3>
                <p className="text-teal-600">Team-based participation</p>
                <p className="text-sm text-teal-500 mt-2">You'll need to create teams for players to join</p>
              </button>

              <button
                onClick={() => createSessionWithMode("both")}
                className="p-6 bg-purple-50 hover:bg-purple-100 rounded-xl border-2 border-purple-200 hover:border-purple-300 transition-all"
              >
                <UserPlus className="w-8 h-8 text-purple-600 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-purple-800 mb-2">Teams & Single Players</h3>
                <p className="text-purple-600">Mixed participation mode</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Session Not Found</h2>
          <p className="text-gray-600 mb-6">The session could not be loaded.</p>
          <button onClick={() => navigate("/host-dashboard")} className="btn-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const soloPlayers = players.filter((p) => p.joinMode === "single" || !p.teamId)

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800">Host Interface</h1>
            <p className="text-gray-600 mt-2">Managing Session: {sessionId}</p>
          </div>
          <div className="flex space-x-4">
            <button onClick={handleExportSession} className="btn-secondary">
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </button>
            <button onClick={() => navigate("/host-dashboard")} className="btn-secondary">
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Session Info */}
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Session Information</h2>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowPlayerModeChange(true)}
                className="flex items-center px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Edit className="w-4 h-4 mr-2" />
                Change Mode
              </button>
              <div className="flex items-center space-x-2 сондары:">
                <Crown className="w-5 h-5 text-orange-500" />
                <span className="text-sm text-gray-600">Round {session.round}</span>
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">Joining Code</h3>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold text-blue-600">{sessionId}</span>
                <button
                  onClick={copyJoiningCode}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="bg-teal-50 rounded-lg p-4">
              <h3 className="font-semibold text-teal-800 mb-2">Total Players</h3>
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-teal-600" />
                <span className="text-xl font-bold text-teal-600">{players.length}</span>
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <h3 className="font-semibold text-purple-800 mb-2">Teams</h3>
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-purple-600" />
                <span className="text-xl font-bold text-purple-600">{teams.length}</span>
              </div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <h3 className="font-semibold text-orange-800 mb-2">Player Mode</h3>
              <div className="text-sm font-medium text-orange-600">
                {playerMode === "single" ? "Solo Only" : playerMode === "teams" ? "Teams Only" : "Mixed Mode"}
              </div>
            </div>
          </div>

          {/* Teams Only Mode Message */}
          {playerMode === "teams" && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center text-yellow-800">
                <Settings className="w-5 h-5 mr-2" />
                <span className="font-semibold">Teams Only Mode Active</span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                Players can only join existing teams. Create teams below for players to join with team name and
                password.
              </p>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("taporder")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === "taporder" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Tap Order
          </button>
          <button
            onClick={() => setActiveTab("teams")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === "teams" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Teams ({teams.length})
          </button>
          <button
            onClick={() => setActiveTab("players")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === "players" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Solo Players ({soloPlayers.length})
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "taporder" && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Button Tap Order - Round {session.round}</h2>
              <button onClick={refreshRound} className="flex items-center space-x-2 btn-accent" disabled={isDeleting}>
                <RefreshCw className={`w-4 h-4 ${isDeleting ? "animate-spin" : ""}`} />
                <span>{isDeleting ? "Starting..." : "New Round"}</span>
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {tapOrder.length > 0 ? (
                tapOrder.map((tap, index) => (
                  <div
                    key={tap.tapId}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-l-4 border-blue-500"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <span className="font-semibold text-gray-800">{tap.playerName}</span>
                        {tap.teamName && <div className="text-sm text-teal-600">Team: {tap.teamName}</div>}
                        <div className="text-sm text-gray-600">{tap.time}</div>
                      </div>
                    </div>
                    <Timer className="w-5 h-5 text-blue-600" />
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>Waiting for participants to tap the button...</p>
                  <p className="text-sm mt-2">
                    Share the joining code: <strong>{sessionId}</strong>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "teams" && (
          <div className="space-y-6">
            {/* Team Creation */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Team Management</h3>
                <button
                  onClick={() => setShowTeamCreator(!showTeamCreator)}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Team
                </button>
              </div>

              {showTeamCreator && (
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <h4 className="font-semibold text-gray-800 mb-3">Create New Team</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Team Name"
                      className="input-field"
                      value={newTeam.name}
                      onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                    />
                    <input
                      type="password"
                      placeholder="Team Password"
                      className="input-field"
                      value={newTeam.password}
                      onChange={(e) => setNewTeam({ ...newTeam, password: e.target.value })}
                    />
                  </div>
                  <div className="flex space-x-4 mt-4">
                    <button
                      onClick={createTeam}
                      className="btn-primary"
                      disabled={isDeleting || !newTeam.name.trim() || !newTeam.password.trim()}
                    >
                      {isDeleting ? "Creating..." : "Create Team"}
                    </button>
                    <button
                      onClick={() => {
                        setShowTeamCreator(false)
                        setNewTeam({ name: "", password: "" })
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Teams List */}
              <div className="lg:col-span-1">
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Teams ({teams.length})</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {teams.map((team) => {
                      const teamPlayerCount = players.filter((p) => p.teamId === team.teamId).length
                      return (
                        <div
                          key={team.teamId}
                          className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            selectedTeam?.teamId === team.teamId
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                          onClick={() => {
                            setSelectedTeam(team)
                            setTeamPlayersList(players.filter((p) => p.teamId === team.teamId))
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-gray-800">{team.teamName}</h4>
                              <div className="flex items-center space-x-3 text-sm text-gray-600">
                                <span className="flex items-center">
                                  <Users className="w-3 h-3 mr-1" />
                                  {teamPlayerCount} players
                                </span>
                                <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                                  {team.createdBy === "player" ? "Player-set password" : `Password: ${team.password}`}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteTeam(team.teamId)
                              }}
                              className="p-1 text-red-600 hover:text-red-800 transition-colors"
                              disabled={isDeleting}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                    {teams.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p>No teams created yet</p>
                        <p className="text-sm mt-2">Create teams for players to join</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Team Details */}
              <div className="lg:col-span-2">
                {selectedTeam ? (
                  <div className="card">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">{selectedTeam.teamName}</h3>
                        <p className="text-sm text-gray-500">
                          {selectedTeam.createdBy === "player"
                            ? "Player-set password"
                            : `Password: `}
                          {selectedTeam.createdBy !== "player" && (
                            <span className="font-mono bg-gray-100 px-2 py-1 rounded">{selectedTeam.password}</span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">
                          Created: {new Date(selectedTeam.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">{teamPlayersList.length}</div>
                        <div className="text-sm text-gray-600">Members</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-gray-800 mb-4">Team Members</h4>
                      {teamPlayersList.length > 0 ? (
                        <div className="space-y-3">
                          {teamPlayersList.map((player, index) => (
                            <div
                              key={player.playerId}
                              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                  {index === 0 ? (
                                    <Crown className="w-5 h-5 text-blue-600" />
                                  ) : (
                                    <Shield className="w-5 h-5 text-gray-600" />
                                  )}
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-800">{player.playerName}</div>
                                  <div className="text-sm text-gray-600">
                                    Joined: {new Date(player.createdAt).toLocaleDateString()}
                                  </div>
                                  {index === 0 && <div className="text-xs text-blue-600 font-medium">Team Leader</div>}
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemovePlayer(player.playerId)}
                                className="p-2 text-red-600 hover:text-red-800 transition-colors"
                                title="Remove from Team"
                                disabled={isDeleting}
                              >
                                <UserMinus className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                          <p>No members in this team yet</p>
                          <p className="text-sm mt-2">Share team name and password with players</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="card text-center py-12">
                    <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Select a Team</h3>
                    <p className="text-gray-600">Choose a team from the list to view and manage its members</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "players" && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Solo Players ({soloPlayers.length})
            </h3>
            {soloPlayers.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {soloPlayers.map((player) => (
                  <div key={player.playerId} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">{player.playerName}</div>
                          <div className="text-sm text-gray-600">
                            Joined: {new Date(player.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemovePlayer(player.playerId)}
                        className="p-2 text-red-600 hover:text-red-800 transition-colors"
                        title="Remove Player"
                        disabled={isDeleting}
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <User className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No solo players yet</p>
                <p className="text-sm">Players will appear here when they join as individuals</p>
              </div>
            )}
          </div>
        )}

        {/* Player Mode Change Modal */}
        {showPlayerModeChange && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="card max-w-md w-full">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Change Player Mode</h3>
              <p className="text-gray-600 mb-6">
                Current mode:{" "}
                <strong>
                  {playerMode === "single" ? "Solo Only" : playerMode === "teams" ? "Teams Only" : "Mixed Mode"}
                </strong>
              </p>

              <div className="space-y-3 mb-6">
                <button
                  onClick={() => changePlayerMode("single")}
                  className={`w-full p-3 rounded-lg border-2 transition-all ${
                    playerMode === "single" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"
                  }`}
                  disabled={isDeleting}
                >
                  <User className="w-5 h-5 mx-auto mb-2 text-blue-600" />
                  <div className="font-semibold">Single Players Only</div>
                </button>

                <button
                  onClick={() => changePlayerMode("teams")}
                  className={`w-full p-3 rounded-lg border-2 transition-all ${
                    playerMode === "teams" ? "border-teal-500 bg-teal-50" : "border-gray-200 hover:border-teal-300"
                  }`}
                  disabled={isDeleting}
                >
                  <Users className="w-5 h-5 mx-auto mb-2 text-teal-600" />
                  <div className="font-semibold">Teams Only</div>
                </button>

                <button
                  onClick={() => changePlayerMode("both")}
                  className={`w-full p-3 rounded-lg border-2 transition-all ${
                    playerMode === "both" ? "border-purple-500 bg-purple-50" : "border-gray-200 hover:border-purple-300"
                  }`}
                  disabled={isDeleting}
                >
                  <UserPlus className="w-5 h-5 mx-auto mb-2 text-purple-600" />
                  <div className="font-semibold">Mixed Mode</div>
                </button>
              </div>

              <button
                onClick={() => setShowPlayerModeChange(false)}
                className="w-full py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default HostInterface