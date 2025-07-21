"use client"

import { useState, useEffect } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { TrendingUp, Users, Trophy, Download, Calendar, Target } from "lucide-react"
import dataExportService from "../services/dataExport"

const StatisticsDashboard = ({ hostUsername, sessions }) => {
  const [statistics, setStatistics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedTimeframe, setSelectedTimeframe] = useState("all")

  useEffect(() => {
    if (sessions.length > 0) {
      calculateStatistics()
    } else {
      setLoading(false)
    }
  }, [sessions, selectedTimeframe])

  const calculateStatistics = async () => {
    try {
      setLoading(true)

      const filteredSessions = filterSessionsByTimeframe(sessions)
      const detailedStats = []

      for (const session of filteredSessions) {
        const [teams, players, tapOrder] = await Promise.all([
          getSessionTeams(session.sessionId),
          getSessionPlayers(session.sessionId),
          getAllSessionTaps(session.sessionId),
        ])

        detailedStats.push({
          ...session,
          teams,
          players,
          tapOrder,
          totalPlayers: players.length,
          totalTeams: teams.length,
          totalTaps: tapOrder.length,
          averageResponseTime: calculateAverageResponseTime(tapOrder),
          participationRate: calculateParticipationRate(players, tapOrder),
        })
      }

      const aggregatedStats = aggregateStatistics(detailedStats)
      setStatistics(aggregatedStats)
    } catch (error) {
      console.error("Error calculating statistics:", error)
    }
    setLoading(false)
  }

  const filterSessionsByTimeframe = (sessions) => {
    const now = new Date()
    const timeframes = {
      "7d": new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      "30d": new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      "90d": new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      all: new Date(0),
    }

    const cutoffDate = timeframes[selectedTimeframe]
    return sessions.filter((session) => new Date(session.createdAt) >= cutoffDate)
  }

  const getSessionTeams = async (sessionId) => {
    try {
      const response = await googleSheetsService.makeRequest("/values/Teams!A:E")
      const values = response.values || []
      return values
        .slice(1)
        .filter((row) => row[1] === sessionId)
        .map((row) => ({
          teamId: row[0],
          teamName: row[2],
          createdAt: row[4],
        }))
    } catch (error) {
      return []
    }
  }

  const getSessionPlayers = async (sessionId) => {
    try {
      const response = await googleSheetsService.makeRequest("/values/Players!A:F")
      const values = response.values || []
      return values
        .slice(1)
        .filter((row) => row[1] === sessionId)
        .map((row) => ({
          playerId: row[0],
          playerName: row[3],
          joinMode: row[4],
          createdAt: row[5],
        }))
    } catch (error) {
      return []
    }
  }

  const getAllSessionTaps = async (sessionId) => {
    try {
      const response = await googleSheetsService.makeRequest("/values/TapOrder!A:G")
      const values = response.values || []
      return values
        .slice(1)
        .filter((row) => row[1] === sessionId)
        .map((row) => ({
          playerName: row[2],
          round: Number.parseInt(row[4]),
          timestamp: Number.parseInt(row[5]),
        }))
    } catch (error) {
      return []
    }
  }

  const calculateAverageResponseTime = (tapOrder) => {
    if (tapOrder.length === 0) return 0

    // Group by round and calculate average position
    const roundGroups = tapOrder.reduce((groups, tap) => {
      if (!groups[tap.round]) groups[tap.round] = []
      groups[tap.round].push(tap)
      return groups
    }, {})

    let totalResponseTime = 0
    let totalTaps = 0

    Object.values(roundGroups).forEach((roundTaps) => {
      roundTaps.sort((a, b) => a.timestamp - b.timestamp)
      roundTaps.forEach((tap, index) => {
        totalResponseTime += (index + 1) * 100 // Simplified calculation
        totalTaps++
      })
    })

    return totalTaps > 0 ? Math.round(totalResponseTime / totalTaps) : 0
  }

  const calculateParticipationRate = (players, tapOrder) => {
    if (players.length === 0) return 0
    const uniqueParticipants = new Set(tapOrder.map((tap) => tap.playerName)).size
    return Math.round((uniqueParticipants / players.length) * 100)
  }

  const aggregateStatistics = (detailedStats) => {
    const totalSessions = detailedStats.length
    const totalPlayers = detailedStats.reduce((sum, session) => sum + session.totalPlayers, 0)
    const totalTeams = detailedStats.reduce((sum, session) => sum + session.totalTeams, 0)
    const totalTaps = detailedStats.reduce((sum, session) => sum + session.totalTaps, 0)
    const totalRounds = detailedStats.reduce((sum, session) => sum + session.round, 0)

    // Session activity over time
    const sessionActivity = detailedStats.map((session) => ({
      date: new Date(session.createdAt).toLocaleDateString(),
      sessions: 1,
      players: session.totalPlayers,
      taps: session.totalTaps,
    }))

    // Player mode distribution
    const playerModeDistribution = detailedStats.reduce((dist, session) => {
      dist[session.playerMode] = (dist[session.playerMode] || 0) + 1
      return dist
    }, {})

    const playerModeData = Object.entries(playerModeDistribution).map(([mode, count]) => ({
      name: mode === "single" ? "Single Players" : mode === "teams" ? "Teams Only" : "Mixed Mode",
      value: count,
      percentage: Math.round((count / totalSessions) * 100),
    }))

    // Top performing sessions
    const topSessions = detailedStats
      .sort((a, b) => b.totalTaps - a.totalTaps)
      .slice(0, 5)
      .map((session) => ({
        sessionId: session.sessionId,
        players: session.totalPlayers,
        taps: session.totalTaps,
        rounds: session.round,
        participationRate: session.participationRate,
      }))

    // Average statistics
    const averagePlayersPerSession = totalSessions > 0 ? Math.round(totalPlayers / totalSessions) : 0
    const averageTapsPerSession = totalSessions > 0 ? Math.round(totalTaps / totalSessions) : 0
    const averageRoundsPerSession = totalSessions > 0 ? Math.round(totalRounds / totalSessions) : 0

    return {
      overview: {
        totalSessions,
        totalPlayers,
        totalTeams,
        totalTaps,
        totalRounds,
        averagePlayersPerSession,
        averageTapsPerSession,
        averageRoundsPerSession,
      },
      sessionActivity,
      playerModeData,
      topSessions,
      detailedStats,
    }
  }

  const handleExportStatistics = async () => {
    try {
      await dataExportService.exportHostStatistics(hostUsername)
    } catch (error) {
      alert("Failed to export statistics. Please try again.")
    }
  }

  const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444"]

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading statistics...</span>
      </div>
    )
  }

  if (!statistics || statistics.overview.totalSessions === 0) {
    return (
      <div className="text-center p-8">
        <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-800 mb-2">No Statistics Available</h3>
        <p className="text-gray-600">Create some sessions to see your statistics here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Statistics Dashboard</h2>
        <div className="flex items-center space-x-4">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
          <button
            onClick={handleExportStatistics}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card text-center">
          <Calendar className="w-8 h-8 text-blue-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-800">Total Sessions</h3>
          <p className="text-3xl font-bold text-blue-600">{statistics.overview.totalSessions}</p>
          <p className="text-sm text-gray-600">Avg {statistics.overview.averagePlayersPerSession} players/session</p>
        </div>

        <div className="card text-center">
          <Users className="w-8 h-8 text-teal-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-800">Total Players</h3>
          <p className="text-3xl font-bold text-teal-600">{statistics.overview.totalPlayers}</p>
          <p className="text-sm text-gray-600">{statistics.overview.totalTeams} teams created</p>
        </div>

        <div className="card text-center">
          <Target className="w-8 h-8 text-orange-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-800">Total Taps</h3>
          <p className="text-3xl font-bold text-orange-600">{statistics.overview.totalTaps}</p>
          <p className="text-sm text-gray-600">Avg {statistics.overview.averageTapsPerSession} taps/session</p>
        </div>

        <div className="card text-center">
          <Trophy className="w-8 h-8 text-purple-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-800">Total Rounds</h3>
          <p className="text-3xl font-bold text-purple-600">{statistics.overview.totalRounds}</p>
          <p className="text-sm text-gray-600">Avg {statistics.overview.averageRoundsPerSession} rounds/session</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Player Mode Distribution */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Player Mode Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statistics.playerModeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name} (${percentage}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statistics.playerModeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Session Activity */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Session Activity</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statistics.sessionActivity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="players" fill="#3B82F6" name="Players" />
              <Bar dataKey="taps" fill="#10B981" name="Taps" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Sessions */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Performing Sessions</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Session ID</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Players</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Total Taps</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Rounds</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Participation Rate</th>
              </tr>
            </thead>
            <tbody>
              {statistics.topSessions.map((session, index) => (
                <tr key={session.sessionId} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mr-3 ${
                          index === 0
                            ? "bg-yellow-500"
                            : index === 1
                              ? "bg-gray-400"
                              : index === 2
                                ? "bg-orange-500"
                                : "bg-blue-500"
                        }`}
                      >
                        {index + 1}
                      </div>
                      {session.sessionId}
                    </div>
                  </td>
                  <td className="py-3 px-4">{session.players}</td>
                  <td className="py-3 px-4">{session.taps}</td>
                  <td className="py-3 px-4">{session.rounds}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center">
                      <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${session.participationRate}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{session.participationRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default StatisticsDashboard
