class GoogleSheetsService {
  constructor() {
    // Handle both browser (Vite) and Node.js environments
    if (typeof import.meta !== "undefined" && import.meta.env) {
      // Browser environment with Vite
      this.spreadsheetId = import.meta.env.VITE_GOOGLE_SPREADSHEET_ID
      this.serviceAccountEmail = import.meta.env.VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL
      this.privateKey = import.meta.env.VITE_GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n")
    } else if (typeof process !== "undefined" && process.env) {
      // Node.js environment
      this.spreadsheetId = process.env.VITE_GOOGLE_SPREADSHEET_ID
      this.serviceAccountEmail = process.env.VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL
      this.privateKey = process.env.VITE_GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n")
    } else {
      // Fallback - you can set these directly for testing
      console.warn("No environment variables found. Please set up your .env file.")
      this.spreadsheetId = null
      this.serviceAccountEmail = null
      this.privateKey = null
    }

    this.accessToken = null
    this.tokenExpiry = null

    // Rate limiting and caching
    this.requestQueue = []
    this.isProcessingQueue = false
    this.cache = new Map()
    this.cacheExpiry = new Map()
    this.lastRequestTime = 0
    this.minRequestInterval = 1100 // 1.1 seconds between requests to stay under 60/minute
  }

  // Cache management
  getCacheKey(endpoint, options = {}) {
    return `${endpoint}_${JSON.stringify(options)}`
  }

  setCache(key, data, ttl = 30000) {
    // 30 second cache by default
    this.cache.set(key, data)
    this.cacheExpiry.set(key, Date.now() + ttl)
  }

  getCache(key) {
    if (this.cache.has(key) && Date.now() < this.cacheExpiry.get(key)) {
      return this.cache.get(key)
    }
    this.cache.delete(key)
    this.cacheExpiry.delete(key)
    return null
  }

  clearCache() {
    this.cache.clear()
    this.cacheExpiry.clear()
  }

  // Rate limiting
  async waitForRateLimit() {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest
      await new Promise((resolve) => setTimeout(resolve, waitTime))
    }
    this.lastRequestTime = Date.now()
  }

  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken
    }

    try {
      const jwt = await this.createJWT()
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: jwt,
        }),
      })

      const data = await response.json()
      if (data.access_token) {
        this.accessToken = data.access_token
        this.tokenExpiry = Date.now() + data.expires_in * 1000 - 60000 // 1 minute buffer
        return this.accessToken
      }
      throw new Error("Failed to get access token")
    } catch (error) {
      console.error("Error getting access token:", error)
      throw error
    }
  }

  async createJWT() {
    const header = {
      alg: "RS256",
      typ: "JWT",
    }

    const now = Math.floor(Date.now() / 1000)
    const payload = {
      iss: this.serviceAccountEmail,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    }

    const encodedHeader = btoa(JSON.stringify(header)).replace(/[+/=]/g, (m) => ({ "+": "-", "/": "_", "=": "" })[m])
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/[+/=]/g, (m) => ({ "+": "-", "/": "_", "=": "" })[m])

    const signatureInput = `${encodedHeader}.${encodedPayload}`

    // Import the private key
    const privateKeyBuffer = this.pemToArrayBuffer(this.privateKey)
    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      privateKeyBuffer,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
      },
      false,
      ["sign"],
    )

    // Sign the JWT
    const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(signatureInput))

    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(
      /[+/=]/g,
      (m) => ({ "+": "-", "/": "_", "=": "" })[m],
    )

    return `${signatureInput}.${encodedSignature}`
  }

  pemToArrayBuffer(pem) {
    const b64 = pem
      .replace(/-----BEGIN PRIVATE KEY-----/, "")
      .replace(/-----END PRIVATE KEY-----/, "")
      .replace(/\s/g, "")
    const binaryString = atob(b64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes.buffer
  }

  async makeRequest(endpoint, options = {}) {
    // Check cache first for GET requests
    if (!options.method || options.method === "GET") {
      const cacheKey = this.getCacheKey(endpoint, options)
      const cached = this.getCache(cacheKey)
      if (cached) {
        return cached
      }
    }

    try {
      await this.waitForRateLimit()

      const token = await this.getAccessToken()
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}${endpoint}`

      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`API Error: ${response.status} ${response.statusText}`)
        console.error(`Error details: ${errorText}`)

        // Handle rate limiting
        if (response.status === 429) {
          console.warn("Rate limit hit, waiting 60 seconds...")
          await new Promise((resolve) => setTimeout(resolve, 60000))
          return this.makeRequest(endpoint, options) // Retry
        }

        throw new Error(`Google Sheets API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()

      // Cache GET requests
      if (!options.method || options.method === "GET") {
        const cacheKey = this.getCacheKey(endpoint, options)
        this.setCache(cacheKey, data)
      }

      return data
    } catch (error) {
      console.error("Request failed:", error)
      throw error
    }
  }

  // Initialize sheets if they don't exist
  async initializeSheets() {
    try {
      // Check if sheets exist, if not create them
      const sheets = ["Hosts", "Sessions", "Teams", "Players", "TapOrder"]

      for (const sheetName of sheets) {
        try {
          await this.makeRequest(`/values/${sheetName}!A1`)
        } catch (error) {
          // Sheet doesn't exist, create it
          await this.createSheet(sheetName)
          await this.initializeSheetHeaders(sheetName)
        }
      }
    } catch (error) {
      console.error("Error initializing sheets:", error)
    }
  }

  async createSheet(sheetName) {
    await this.makeRequest("", {
      method: "POST",
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetName,
              },
            },
          },
        ],
      }),
    })
  }

  async initializeSheetHeaders(sheetName) {
    const headers = {
      Hosts: ["username", "password", "createdAt"],
      Sessions: ["sessionId", "hostUsername", "playerMode", "round", "createdAt", "active"],
      Teams: ["teamId", "sessionId", "teamName", "password", "createdAt"],
      Players: ["playerId", "sessionId", "teamId", "playerName", "joinMode", "createdAt"],
      TapOrder: ["tapId", "sessionId", "playerName", "teamName", "round", "timestamp", "time"],
    }

    if (headers[sheetName]) {
      await this.makeRequest(
        `/values/${sheetName}!A1:${String.fromCharCode(64 + headers[sheetName].length)}1?valueInputOption=RAW`,
        {
          method: "PUT",
          body: JSON.stringify({
            values: [headers[sheetName]],
          }),
        },
      )
    }
  }

  // Host operations
  async checkHostExists(username) {
    try {
      const response = await this.makeRequest("/values/Hosts!A:A")
      const values = response.values || []
      return values.some((row) => row[0] === username)
    } catch (error) {
      console.error("Error checking host:", error)
      return false
    }
  }

  async createHost(username, password) {
    const exists = await this.checkHostExists(username)
    if (exists) {
      throw new Error("Username already exists")
    }

    await this.makeRequest("/values/Hosts!A:C:append?valueInputOption=RAW", {
      method: "POST",
      body: JSON.stringify({
        values: [[username, password, new Date().toISOString()]],
      }),
    })

    // Clear cache
    this.clearCache()
  }

  async validateHost(username, password) {
    try {
      const response = await this.makeRequest("/values/Hosts!A:C")
      const values = response.values || []
      const host = values.find((row) => row[0] === username && row[1] === password)
      return !!host
    } catch (error) {
      console.error("Error validating host:", error)
      return false
    }
  }

  async deleteHost(username) {
    try {
      console.log(`Starting complete deletion of host: ${username}`)

      // Get all sessions for this host first
      const sessions = await this.getHostSessions(username)
      console.log(`Found ${sessions.length} sessions to delete for host: ${username}`)

      // Delete all sessions and their related data
      for (const session of sessions) {
        console.log(`Deleting session: ${session.sessionId}`)
        await this.deleteSessionData(session.sessionId)
      }

      // Now delete the host record itself
      await this.deleteAllRowsForHost("Hosts", username, "A")

      console.log(`Successfully deleted host: ${username} and all related data`)
      this.clearCache()
    } catch (error) {
      console.error("Error deleting host:", error)
      throw error
    }
  }

  // Session operations
  async createSession(sessionId, hostUsername, playerMode) {
    // Check if session already exists
    const existingSession = await this.getSession(sessionId)
    if (existingSession) {
      console.log(`Session ${sessionId} already exists, updating player mode`)
      await this.updateSessionPlayerMode(sessionId, playerMode)
      return
    }

    await this.makeRequest("/values/Sessions!A:F:append?valueInputOption=RAW", {
      method: "POST",
      body: JSON.stringify({
        values: [[sessionId, hostUsername, playerMode, 1, new Date().toISOString(), true]],
      }),
    })

    this.clearCache()
  }

  async updateSessionPlayerMode(sessionId, playerMode) {
    try {
      const response = await this.makeRequest("/values/Sessions!A:F")
      const values = response.values || []
      const sessionIndex = values.findIndex((row) => row[0] === sessionId)

      if (sessionIndex !== -1) {
        await this.makeRequest(`/values/Sessions!C${sessionIndex + 1}?valueInputOption=RAW`, {
          method: "PUT",
          body: JSON.stringify({
            values: [[playerMode]],
          }),
        })
        console.log(`Updated session ${sessionId} player mode to ${playerMode}`)
        this.clearCache()
      }
    } catch (error) {
      console.error("Error updating session player mode:", error)
      throw error
    }
  }

  async getHostSessions(hostUsername) {
    try {
      const response = await this.makeRequest("/values/Sessions!A:F")
      const values = response.values || []
      return values
        .slice(1)
        .filter((row) => row[1] === hostUsername)
        .map((row) => ({
          sessionId: row[0],
          hostUsername: row[1],
          playerMode: row[2],
          round: Number.parseInt(row[3]) || 1,
          createdAt: row[4],
          active: row[5] === "true",
        }))
    } catch (error) {
      console.error("Error getting host sessions:", error)
      return []
    }
  }

  async getSession(sessionId) {
    try {
      const response = await this.makeRequest("/values/Sessions!A:F")
      const values = response.values || []
      const session = values.find((row) => row[0] === sessionId)
      if (session) {
        return {
          sessionId: session[0],
          hostUsername: session[1],
          playerMode: session[2],
          round: Number.parseInt(session[3]) || 1,
          createdAt: session[4],
          active: session[5] === "true",
        }
      }
      return null
    } catch (error) {
      console.error("Error getting session:", error)
      return null
    }
  }

  async updateSessionRound(sessionId, round) {
    try {
      const response = await this.makeRequest("/values/Sessions!A:F")
      const values = response.values || []
      const sessionIndex = values.findIndex((row) => row[0] === sessionId)

      if (sessionIndex !== -1) {
        await this.makeRequest(`/values/Sessions!D${sessionIndex + 1}?valueInputOption=RAW`, {
          method: "PUT",
          body: JSON.stringify({
            values: [[round]],
          }),
        })
        console.log(`Updated session ${sessionId} to round ${round}`)
        this.clearCache()
      }
    } catch (error) {
      console.error("Error updating session round:", error)
      throw error
    }
  }

  async deleteSessionData(sessionId) {
    try {
      console.log(`Starting complete deletion of session: ${sessionId}`)

      // Delete in specific order to avoid foreign key issues
      // 1. First delete TapOrder data
      await this.deleteAllRowsForSession("TapOrder", sessionId, "B")

      // 2. Then delete Players data
      await this.deleteAllRowsForSession("Players", sessionId, "B")

      // 3. Then delete Teams data
      await this.deleteAllRowsForSession("Teams", sessionId, "B")

      // 4. Finally delete the Session itself
      await this.deleteAllRowsForSession("Sessions", sessionId, "A")

      console.log(`Successfully deleted ALL data for session: ${sessionId}`)
      this.clearCache()
    } catch (error) {
      console.error("Error deleting session data:", error)
      throw error
    }
  }

  async deleteAllRowsForSession(sheetName, sessionId, column) {
    try {
      console.log(`Deleting all ${sheetName} data for session: ${sessionId}`)

      // Get all data from the sheet
      const response = await this.makeRequest(`/values/${sheetName}!A:Z`)
      const values = response.values || []

      if (values.length <= 1) {
        console.log(`No data to delete in ${sheetName}`)
        return
      }

      const columnIndex = column.charCodeAt(0) - 65 // A=0, B=1, etc.
      const rowsToDelete = []

      // Find all rows that match the session ID (skip header row)
      for (let i = 1; i < values.length; i++) {
        if (values[i][columnIndex] === sessionId) {
          rowsToDelete.push(i)
        }
      }

      if (rowsToDelete.length === 0) {
        console.log(`No matching rows found in ${sheetName} for session: ${sessionId}`)
        return
      }

      console.log(`Found ${rowsToDelete.length} rows to delete in ${sheetName}`)

      // Get sheet ID for batch operations
      const sheetId = await this.getSheetId(sheetName)

      // Delete rows in reverse order (from bottom to top) to maintain row indices
      for (let i = rowsToDelete.length - 1; i >= 0; i--) {
        const rowIndex = rowsToDelete[i]

        try {
          await this.makeRequest(`:batchUpdate`, {
            method: "POST",
            body: JSON.stringify({
              requests: [
                {
                  deleteDimension: {
                    range: {
                      sheetId: sheetId,
                      dimension: "ROWS",
                      startIndex: rowIndex,
                      endIndex: rowIndex + 1,
                    },
                  },
                },
              ],
            }),
          })
        } catch (error) {
          console.error(`Error deleting row ${rowIndex + 1} from ${sheetName}:`, error)
          // Continue with other rows even if one fails
        }

        console.log(`Deleted row ${rowIndex + 1} from ${sheetName}`)

        // Wait a bit between deletions to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200))
      }
    } catch (error) {
      console.error(`Error deleting data from ${sheetName}:`, error)
      // Fallback to clearing method if deletion fails
      console.log(`Falling back to clearing method for ${sheetName}`)
      await this.clearAllDataForSession(sheetName, sessionId, column)
    }
  }

  async deleteAllRowsForHost(sheetName, username, column) {
    try {
      console.log(`Deleting host ${username} from ${sheetName}`)

      // Get all data from the sheet
      const response = await this.makeRequest(`/values/${sheetName}!A:Z`)
      const values = response.values || []

      if (values.length <= 1) {
        console.log(`No data to delete in ${sheetName}`)
        return
      }

      const columnIndex = column.charCodeAt(0) - 65 // A=0, B=1, etc.
      const rowsToDelete = []

      // Find all rows that match the username (skip header row)
      for (let i = 1; i < values.length; i++) {
        if (values[i][columnIndex] === username) {
          rowsToDelete.push(i)
        }
      }

      if (rowsToDelete.length === 0) {
        console.log(`No matching rows found in ${sheetName} for host: ${username}`)
        return
      }

      console.log(`Found ${rowsToDelete.length} rows to delete in ${sheetName}`)

      // Get sheet ID for batch operations
      const sheetId = await this.getSheetId(sheetName)

      // Delete rows in reverse order (from bottom to top) to maintain row indices
      for (let i = rowsToDelete.length - 1; i >= 0; i--) {
        const rowIndex = rowsToDelete[i]

        try {
          await this.makeRequest(`:batchUpdate`, {
            method: "POST",
            body: JSON.stringify({
              requests: [
                {
                  deleteDimension: {
                    range: {
                      sheetId: sheetId,
                      dimension: "ROWS",
                      startIndex: rowIndex,
                      endIndex: rowIndex + 1,
                    },
                  },
                },
              ],
            }),
          })
        } catch (error) {
          console.error(`Error deleting host row ${rowIndex + 1} from ${sheetName}:`, error)
          // Continue with other rows even if one fails
        }

        console.log(`Deleted host row ${rowIndex + 1} from ${sheetName}`)

        // Wait a bit between deletions to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200))
      }
    } catch (error) {
      console.error(`Error deleting host from ${sheetName}:`, error)
      throw error
    }
  }

  async deleteRowsCompletely(sheetName, column, value) {
    try {
      console.log(`Deleting rows from ${sheetName} where ${column}=${value}`)
      await this.deleteAllRowsForSession(sheetName, value, column)
    } catch (error) {
      console.error(`Error deleting rows from ${sheetName}:`, error)
      throw error
    }
  }

  async clearAllDataForSession(sheetName, sessionId, column) {
    try {
      console.log(`Clearing data from ${sheetName} for session: ${sessionId}`)

      const response = await this.makeRequest(`/values/${sheetName}!A:Z`)
      const values = response.values || []
      const columnIndex = column.charCodeAt(0) - 65 // A=0, B=1, etc.

      // Find all rows with this session ID and clear them
      const ranges = []
      values.forEach((row, index) => {
        if (index > 0 && row[columnIndex] === sessionId) {
          // Skip header row
          ranges.push(`${sheetName}!A${index + 1}:Z${index + 1}`)
        }
      })

      if (ranges.length > 0) {
        // Use batch clear for better performance
        await this.makeRequest("/values:batchClear", {
          method: "POST",
          body: JSON.stringify({
            ranges: ranges,
          }),
        })
        console.log(`Cleared ${ranges.length} rows from ${sheetName} for session ${sessionId}`)
      } else {
        console.log(`No rows to clear in ${sheetName} for session ${sessionId}`)
      }
    } catch (error) {
      console.error(`Error clearing data from ${sheetName}:`, error)
      throw error
    }
  }

  async deleteRowsByColumn(sheetName, column, value) {
    try {
      console.log(`Deleting rows from ${sheetName} where ${column}=${value}`)
      await this.deleteAllRowsForSession(sheetName, value, column)
    } catch (error) {
      console.error(`Error deleting rows from ${sheetName}:`, error)
      throw error
    }
  }

  async getSheetId(sheetName) {
    try {
      const response = await this.makeRequest("")
      const sheet = response.sheets.find((s) => s.properties.title === sheetName)
      return sheet ? sheet.properties.sheetId : 0
    } catch (error) {
      console.error("Error getting sheet ID:", error)
      return 0
    }
  }

  // Team operations
  async checkTeamExists(sessionId, teamName) {
    try {
      const response = await this.makeRequest("/values/Teams!A:E")
      const values = response.values || []
      return values.some((row) => row[1] === sessionId && row[2] === teamName)
    } catch (error) {
      console.error("Error checking team:", error)
      return false
    }
  }

  async createTeam(sessionId, teamName, password) {
    const teamId = `${sessionId}_${teamName}_${Date.now()}`
    await this.makeRequest("/values/Teams!A:E:append?valueInputOption=RAW", {
      method: "POST",
      body: JSON.stringify({
        values: [[teamId, sessionId, teamName, password, new Date().toISOString()]],
      }),
    })
    this.clearCache()
    return teamId
  }

  async getTeam(sessionId, teamName) {
    try {
      const response = await this.makeRequest("/values/Teams!A:E")
      const values = response.values || []
      const team = values.find((row) => row[1] === sessionId && row[2] === teamName)
      if (team) {
        return {
          teamId: team[0],
          sessionId: team[1],
          teamName: team[2],
          password: team[3],
          createdAt: team[4],
        }
      }
      return null
    } catch (error) {
      console.error("Error getting team:", error)
      return null
    }
  }

  async validateTeam(sessionId, teamName, password) {
    try {
      const team = await this.getTeam(sessionId, teamName)
      return team && team.password === password
    } catch (error) {
      console.error("Error validating team:", error)
      return false
    }
  }

  async getSessionTeams(sessionId) {
    try {
      const response = await this.makeRequest("/values/Teams!A:E")
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

  // Player operations
  async checkPlayerExists(sessionId, playerName) {
    try {
      const response = await this.makeRequest("/values/Players!A:F")
      const values = response.values || []
      const existingPlayer = values.find((row) => row[1] === sessionId && row[3] === playerName)

      if (existingPlayer) {
        return {
          exists: true,
          player: {
            playerId: existingPlayer[0],
            sessionId: existingPlayer[1],
            teamId: existingPlayer[2],
            playerName: existingPlayer[3],
            joinMode: existingPlayer[4],
            createdAt: existingPlayer[5],
          },
        }
      }

      return { exists: false, player: null }
    } catch (error) {
      console.error("Error checking player:", error)
      return { exists: false, player: null }
    }
  }

  async createPlayer(sessionId, teamId, playerName, joinMode) {
    // Check if player already exists
    const existingCheck = await this.checkPlayerExists(sessionId, playerName)
    if (existingCheck.exists) {
      console.log(`Player ${playerName} already exists in session ${sessionId}`)
      return existingCheck.player.playerId
    }

    const playerId = `${sessionId}_${playerName}_${Date.now()}`
    await this.makeRequest("/values/Players!A:F:append?valueInputOption=RAW", {
      method: "POST",
      body: JSON.stringify({
        values: [[playerId, sessionId, teamId || "", playerName, joinMode, new Date().toISOString()]],
      }),
    })
    this.clearCache()
    return playerId
  }

  async getPlayer(sessionId, playerName) {
    try {
      const response = await this.makeRequest("/values/Players!A:F")
      const values = response.values || []
      const player = values.find((row) => row[1] === sessionId && row[3] === playerName)
      if (player) {
        return {
          playerId: player[0],
          sessionId: player[1],
          teamId: player[2],
          playerName: player[3],
          joinMode: player[4],
          createdAt: player[5],
        }
      }
      return null
    } catch (error) {
      console.error("Error getting player:", error)
      return null
    }
  }

  async getPlayerWithTeamInfo(sessionId, playerName) {
    try {
      const player = await this.getPlayer(sessionId, playerName)
      if (!player) return null

      let teamInfo = null
      if (player.teamId) {
        const response = await this.makeRequest("/values/Teams!A:E")
        const values = response.values || []
        const team = values.find((row) => row[0] === player.teamId)
        if (team) {
          teamInfo = {
            teamId: team[0],
            teamName: team[2],
          }
        }
      }

      return {
        ...player,
        teamInfo,
      }
    } catch (error) {
      console.error("Error getting player with team info:", error)
      return null
    }
  }

  // Tap order operations
  async addTap(sessionId, playerName, teamName, round) {
    const tapId = `${sessionId}_${playerName}_${round}_${Date.now()}`
    const now = new Date()
    await this.makeRequest("/values/TapOrder!A:G:append?valueInputOption=RAW", {
      method: "POST",
      body: JSON.stringify({
        values: [[tapId, sessionId, playerName, teamName || "", round, now.getTime(), now.toLocaleTimeString()]],
      }),
    })
    this.clearCache()
  }

  async getTapOrder(sessionId, round) {
    try {
      const response = await this.makeRequest("/values/TapOrder!A:G")
      const values = response.values || []
      return values
        .slice(1)
        .filter((row) => row[1] === sessionId && Number.parseInt(row[4]) === round)
        .map((row) => ({
          tapId: row[0],
          sessionId: row[1],
          playerName: row[2],
          teamName: row[3],
          round: Number.parseInt(row[4]),
          timestamp: Number.parseInt(row[5]),
          time: row[6],
        }))
        .sort((a, b) => a.timestamp - b.timestamp)
    } catch (error) {
      console.error("Error getting tap order:", error)
      return []
    }
  }

  async clearTapOrder(sessionId, round) {
    try {
      // Clear all tap order data for this session (all rounds)
      await this.deleteRowsCompletely("TapOrder", "B", sessionId)
      console.log(`Cleared tap order for session ${sessionId}`)
      this.clearCache()
    } catch (error) {
      console.error("Error clearing tap order:", error)
      throw error
    }
  }
}

export default new GoogleSheetsService()
