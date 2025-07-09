"use client"

import { useState, useEffect } from "react"
import { Users, UserPlus, UserMinus, Crown, Shield, Save, X, AlertCircle } from "lucide-react"
import googleSheetsService from "../services/googleSheets"

const TeamManagement = ({ sessionId, teams, onTeamsUpdate }) => {
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [teamPlayers, setTeamPlayers] = useState([])
  const [editingTeam, setEditingTeam] = useState(null)
  const [newTeamData, setNewTeamData] = useState({ name: "", password: "" })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (selectedTeam) {
      loadTeamPlayers(selectedTeam.teamId)
    }
  }, [selectedTeam])

  const loadTeamPlayers = async (teamId) => {
    try {
      setLoading(true)
      const response = await googleSheetsService.makeRequest("/values/Players!A:F")
      const values = response.values || []

      const players = values
        .slice(1)
        .filter((row) => row[2] === teamId)
        .map((row) => ({
          playerId: row[0],
          sessionId: row[1],
          teamId: row[2],
          playerName: row[3],
          joinMode: row[4],
          createdAt: row[5],
        }))

      setTeamPlayers(players)
    } catch (error) {
      console.error("Error loading team players:", error)
      setError("Failed to load team players")
    }
    setLoading(false)
  }

  const handleCreateTeam = async () => {
    if (!newTeamData.name.trim() || !newTeamData.password.trim()) {
      setError("Please fill in all fields")
      return
    }

    try {
      setLoading(true)
      setError("")

      // Check if team name already exists
      const exists = await googleSheetsService.checkTeamExists(sessionId, newTeamData.name)
      if (exists) {
        setError("Team name already exists")
        setLoading(false)
        return
      }

      await googleSheetsService.createTeam(sessionId, newTeamData.name, newTeamData.password)
      setNewTeamData({ name: "", password: "" })
      onTeamsUpdate() // Refresh teams list
    } catch (error) {
      console.error("Error creating team:", error)
      setError("Failed to create team")
    }
    setLoading(false)
  }

  const handleDeleteTeam = async (teamId) => {
    if (!confirm("Are you sure you want to delete this team? All team members will be removed.")) {
      return
    }

    try {
      setLoading(true)

      // Delete all players in the team first
      await googleSheetsService.deleteRowsByColumn("Players", "C", teamId)

      // Delete the team
      await googleSheetsService.deleteRowsByColumn("Teams", "A", teamId)

      if (selectedTeam?.teamId === teamId) {
        setSelectedTeam(null)
        setTeamPlayers([])
      }

      onTeamsUpdate() // Refresh teams list
    } catch (error) {
      console.error("Error deleting team:", error)
      setError("Failed to delete team")
    }
    setLoading(false)
  }

  const handleRemovePlayer = async (playerId) => {
    if (!confirm("Are you sure you want to remove this player from the team?")) {
      return
    }

    try {
      setLoading(true)
      await googleSheetsService.deleteRowsByColumn("Players", "A", playerId)
      await loadTeamPlayers(selectedTeam.teamId)
    } catch (error) {
      console.error("Error removing player:", error)
      setError("Failed to remove player")
    }
    setLoading(false)
  }

  const handlePromoteToLeader = async (playerId) => {
    // This is a conceptual feature - you might want to add a "leader" field to your Players sheet
    alert("Team leader promotion feature coming soon!")
  }

  const getTeamStats = (team) => {
    const players = teamPlayers.filter((p) => p.teamId === team.teamId)
    return {
      playerCount: players.length,
      joinedToday: players.filter((p) => {
        const joinDate = new Date(p.createdAt)
        const today = new Date()
        return joinDate.toDateString() === today.toDateString()
      }).length,
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Team Management</h2>
        <div className="text-sm text-gray-600">
          {teams.length} teams • {teamPlayers.length} total players
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center text-red-800">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span className="font-semibold">Error</span>
          </div>
          <p className="text-sm text-red-600 mt-1">{error}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Teams List */}
        <div className="lg:col-span-1">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Teams</h3>
              <button
                onClick={() => setEditingTeam("new")}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
              </button>
            </div>

            {/* Create New Team Form */}
            {editingTeam === "new" && (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-3">Create New Team</h4>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Team Name"
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={newTeamData.name}
                    onChange={(e) => setNewTeamData({ ...newTeamData, name: e.target.value })}
                  />
                  <input
                    type="password"
                    placeholder="Team Password"
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={newTeamData.password}
                    onChange={(e) => setNewTeamData({ ...newTeamData, password: e.target.value })}
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={handleCreateTeam}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Create
                    </button>
                    <button
                      onClick={() => {
                        setEditingTeam(null)
                        setNewTeamData({ name: "", password: "" })
                        setError("")
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {teams.map((team) => {
                const stats = getTeamStats(team)
                return (
                  <div
                    key={team.teamId}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedTeam?.teamId === team.teamId
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedTeam(team)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-800">{team.teamName}</h4>
                        <div className="flex items-center space-x-3 text-sm text-gray-600">
                          <span className="flex items-center">
                            <Users className="w-3 h-3 mr-1" />
                            {stats.playerCount} players
                          </span>
                          {stats.joinedToday > 0 && <span className="text-green-600">+{stats.joinedToday} today</span>}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteTeam(team.teamId)
                        }}
                        className="p-1 text-red-600 hover:text-red-800 transition-colors"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}

              {teams.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>No teams created yet</p>
                  <p className="text-sm">Create your first team to get started</p>
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
                  <p className="text-gray-600">Team ID: {selectedTeam.teamId}</p>
                  <p className="text-sm text-gray-500">
                    Created: {new Date(selectedTeam.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{teamPlayers.length}</div>
                    <div className="text-sm text-gray-600">Members</div>
                  </div>
                </div>
              </div>

              {/* Team Members */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Team Members</h4>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600">Loading members...</span>
                  </div>
                ) : teamPlayers.length > 0 ? (
                  <div className="space-y-3">
                    {teamPlayers.map((player, index) => (
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
                        <div className="flex items-center space-x-2">
                          {index !== 0 && (
                            <button
                              onClick={() => handlePromoteToLeader(player.playerId)}
                              className="p-2 text-blue-600 hover:text-blue-800 transition-colors"
                              title="Promote to Leader"
                            >
                              <Crown className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleRemovePlayer(player.playerId)}
                            className="p-2 text-red-600 hover:text-red-800 transition-colors"
                            title="Remove from Team"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>No members in this team yet</p>
                    <p className="text-sm">Players can join using the team name and password</p>
                  </div>
                )}
              </div>

              {/* Team Statistics */}
              {teamPlayers.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Team Statistics</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{teamPlayers.length}</div>
                      <div className="text-sm text-gray-600">Total Members</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {
                          teamPlayers.filter((p) => {
                            const joinDate = new Date(p.createdAt)
                            const today = new Date()
                            return joinDate.toDateString() === today.toDateString()
                          }).length
                        }
                      </div>
                      <div className="text-sm text-gray-600">Joined Today</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {Math.round(
                          (teamPlayers.length /
                            Math.max(
                              teams.reduce((sum, t) => sum + getTeamStats(t).playerCount, 0),
                              1,
                            )) *
                            100,
                        )}
                        %
                      </div>
                      <div className="text-sm text-gray-600">Of All Players</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {Math.round((new Date() - new Date(selectedTeam.createdAt)) / (1000 * 60 * 60 * 24))}
                      </div>
                      <div className="text-sm text-gray-600">Days Active</div>
                    </div>
                  </div>
                </div>
              )}
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
  )
}

export default TeamManagement
