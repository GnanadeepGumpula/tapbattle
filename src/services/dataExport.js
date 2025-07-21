
class DataExportService {
  // Export session data to CSV format
  async exportSessionData(sessionId) {
    try {
      const session = await googleSheetsService.getSession(sessionId)
      if (!session) {
        throw new Error("Session not found")
      }

      // Get all data for the session
      const [teams, players, tapOrder] = await Promise.all([
        this.getSessionTeams(sessionId),
        this.getSessionPlayers(sessionId),
        this.getAllSessionTaps(sessionId),
      ])

      // Generate CSV data
      const csvData = this.generateSessionCSV(session, teams, players, tapOrder)

      // Download CSV file
      this.downloadCSV(csvData, `session_${sessionId}_export.csv`)

      return true
    } catch (error) {
      console.error("Error exporting session data:", error)
      throw error
    }
  }

  // Export host statistics
  async exportHostStatistics(hostUsername) {
    try {
      const sessions = await googleSheetsService.getHostSessions(hostUsername)

      const statisticsData = []

      for (const session of sessions) {
        const [teams, players, tapOrder] = await Promise.all([
          this.getSessionTeams(session.sessionId),
          this.getSessionPlayers(session.sessionId),
          this.getAllSessionTaps(session.sessionId),
        ])

        const sessionStats = this.calculateSessionStatistics(session, teams, players, tapOrder)
        statisticsData.push(sessionStats)
      }

      const csvData = this.generateHostStatisticsCSV(statisticsData)
      this.downloadCSV(csvData, `host_${hostUsername}_statistics.csv`)

      return true
    } catch (error) {
      console.error("Error exporting host statistics:", error)
      throw error
    }
  }

  // Get teams for a session
  async getSessionTeams(sessionId) {
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
          createdAt: row[4],
        }))
    } catch (error) {
      console.error("Error getting session teams:", error)
      return []
    }
  }

  // Get players for a session
  async getSessionPlayers(sessionId) {
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
      console.error("Error getting session players:", error)
      return []
    }
  }

  // Get all taps for a session (all rounds)
  async getAllSessionTaps(sessionId) {
    try {
      const response = await googleSheetsService.makeRequest("/values/TapOrder!A:G")
      const values = response.values || []
      return values
        .slice(1)
        .filter((row) => row[1] === sessionId)
        .map((row) => ({
          tapId: row[0],
          sessionId: row[1],
          playerName: row[2],
          teamName: row[3],
          round: Number.parseInt(row[4]),
          timestamp: Number.parseInt(row[5]),
          time: row[6],
        }))
        .sort((a, b) => a.round - b.round || a.timestamp - b.timestamp)
    } catch (error) {
      console.error("Error getting session taps:", error)
      return []
    }
  }

  // Generate CSV for session data
  generateSessionCSV(session, teams, players, tapOrder) {
    let csv = "Session Export\n\n"

    // Session info
    csv += "Session Information\n"
    csv += "Session ID,Host,Player Mode,Current Round,Created At,Active\n"
    csv += `${session.sessionId},${session.hostUsername},${session.playerMode},${session.round},${session.createdAt},${session.active}\n\n`

    // Teams
    if (teams.length > 0) {
      csv += "Teams\n"
      csv += "Team ID,Team Name,Created At\n"
      teams.forEach((team) => {
        csv += `${team.teamId},${team.teamName},${team.createdAt}\n`
      })
      csv += "\n"
    }

    // Players
    csv += "Players\n"
    csv += "Player ID,Player Name,Team ID,Join Mode,Created At\n"
    players.forEach((player) => {
      csv += `${player.playerId},${player.playerName},${player.teamId || "N/A"},${player.joinMode},${player.createdAt}\n`
    })
    csv += "\n"

    // Tap Order by Round
    const roundGroups = this.groupTapsByRound(tapOrder)
    Object.keys(roundGroups)
      .sort((a, b) => Number.parseInt(a) - Number.parseInt(b))
      .forEach((round) => {
        csv += `Round ${round} Results\n`
        csv += "Position,Player Name,Team Name,Time,Timestamp\n"
        roundGroups[round].forEach((tap, index) => {
          csv += `${index + 1},${tap.playerName},${tap.teamName || "N/A"},${tap.time},${tap.timestamp}\n`
        })
        csv += "\n"
      })

    return csv
  }

  // Generate CSV for host statistics
  generateHostStatisticsCSV(statisticsData) {
    let csv = "Host Statistics Export\n\n"

    csv += "Session Statistics\n"
    csv += "Session ID,Player Mode,Total Players,Total Teams,Total Rounds,Total Taps,Average Response Time,Created At\n"

    statisticsData.forEach((stats) => {
      csv += `${stats.sessionId},${stats.playerMode},${stats.totalPlayers},${stats.totalTeams},${stats.totalRounds},${stats.totalTaps},${stats.averageResponseTime},${stats.createdAt}\n`
    })

    return csv
  }

  // Calculate session statistics
  calculateSessionStatistics(session, teams, players, tapOrder) {
    const totalPlayers = players.length
    const totalTeams = teams.length
    const totalRounds = session.round
    const totalTaps = tapOrder.length

    // Calculate average response time (simplified)
    const averageResponseTime =
      tapOrder.length > 0
        ? Math.round(tapOrder.reduce((sum, tap) => sum + (tap.timestamp % 10000), 0) / tapOrder.length)
        : 0

    return {
      sessionId: session.sessionId,
      playerMode: session.playerMode,
      totalPlayers,
      totalTeams,
      totalRounds,
      totalTaps,
      averageResponseTime: `${averageResponseTime}ms`,
      createdAt: session.createdAt,
    }
  }

  // Group taps by round
  groupTapsByRound(tapOrder) {
    return tapOrder.reduce((groups, tap) => {
      const round = tap.round.toString()
      if (!groups[round]) {
        groups[round] = []
      }
      groups[round].push(tap)
      return groups
    }, {})
  }

  // Download CSV file
  downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", filename)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  // Export leaderboard data
  async exportLeaderboard(sessionId, round = null) {
    try {
      const session = await googleSheetsService.getSession(sessionId)
      if (!session) {
        throw new Error("Session not found")
      }

      const tapOrder = round
        ? await googleSheetsService.getTapOrder(sessionId, round)
        : await this.getAllSessionTaps(sessionId)

      let csv = `Leaderboard Export - Session ${sessionId}\n\n`

      if (round) {
        csv += `Round ${round} Leaderboard\n`
        csv += "Position,Player Name,Team Name,Time\n"
        tapOrder.forEach((tap, index) => {
          csv += `${index + 1},${tap.playerName},${tap.teamName || "N/A"},${tap.time}\n`
        })
      } else {
        const roundGroups = this.groupTapsByRound(tapOrder)
        Object.keys(roundGroups)
          .sort((a, b) => Number.parseInt(a) - Number.parseInt(b))
          .forEach((roundNum) => {
            csv += `Round ${roundNum} Leaderboard\n`
            csv += "Position,Player Name,Team Name,Time\n"
            roundGroups[roundNum].forEach((tap, index) => {
              csv += `${index + 1},${tap.playerName},${tap.teamName || "N/A"},${tap.time}\n`
            })
            csv += "\n"
          })
      }

      this.downloadCSV(csv, `leaderboard_${sessionId}${round ? `_round_${round}` : ""}.csv`)
      return true
    } catch (error) {
      console.error("Error exporting leaderboard:", error)
      throw error
    }
  }
}

export default new DataExportService()
