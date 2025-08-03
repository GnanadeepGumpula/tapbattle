import axios from "axios";

// More robust environment detection for production
const getBaseURL = () => {
  // Check if we're in production and VITE_API_URL is not set
  if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
    return 'https://tapbattle-server-d2d0btaba6aub8g8.canadacentral-01.azurewebsites.net';
  }
  
  // Use environment variable or default to localhost for development
  return import.meta.env.VITE_API_URL || 'http://localhost:3000';
};

const BASE_URL = getBaseURL();

console.log('API Base URL:', BASE_URL); // Debug log to check what URL is being used

const api = {
  /* ---------------- HOST ROUTES ---------------- */

  // Create/register a host
  createHost: async (username, password) => {
    try {
      const response = await axios.post(`${BASE_URL}/api/hosts`, { username, password });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

// Host login (validate credentials)
loginHost: async (username, password) => {
  try {
    const response = await axios.post(`${BASE_URL}/api/hosts/validate`, { username, password });
    return { success: true, isValid: response.data.isValid };
  } catch (error) {
    return { success: false, error: error.response?.data?.error || error.message };
  }
},



  // Delete a host
  deleteHost: async (username) => {
    try {
      const response = await axios.delete(`${BASE_URL}/api/hosts/${username}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

  /* ---------------- SESSION ROUTES ---------------- */

  // Create a session
  createSession: async (sessionId, hostUsername, playerMode) => {
    try {
      const response = await axios.post(`${BASE_URL}/api/sessions`, {
        sessionId,
        hostUsername,
        playerMode,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

  // Get all sessions for a host
  getHostSessions: async (hostUsername) => {
    try {
      const response = await axios.get(`${BASE_URL}/api/sessions/${hostUsername}`);
      return { success: true, sessions: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || error.message, sessions: [] };
    }
  },

  // Update session round
  updateSessionRound: async (sessionId, round) => {
    try {
      const response = await axios.put(`${BASE_URL}/api/sessions/${sessionId}/round`, { round });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

  // Delete a session
  deleteSession: async (sessionId) => {
    try {
      const response = await axios.delete(`${BASE_URL}/api/sessions/${sessionId}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

  /* ---------------- TEAM ROUTES ---------------- */

  // Create a team
  createTeam: async (sessionId, teamName, password) => {
    try {
      const response = await axios.post(`${BASE_URL}/api/teams`, { sessionId, teamName, password });
      return { success: true, teamId: response.data.teamId };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },
  
  // Get session details
getSession: async (sessionId) => {
  try {
    const res = await axios.get(`${BASE_URL}/api/session/${sessionId}`); // <-- ✅ Add await
    if (!res.data || Object.keys(res.data).length === 0) {
      return { success: false, error: "Session not found" };
    }
    return { success: true, data: res.data };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.error || err.message || "Unknown error",
    };
  }
},

checkPlayerExists: async (sessionId, playerName) => {
  try {
    const res = await axios.get(`${BASE_URL}/api/session/${sessionId}/player/${playerName}/exists`)
    return res.data
  } catch (err) {
    return { success: false, error: err.message }
  }
},



  // Validate team credentials
  validateTeam: async (sessionId, teamName, password) => {
    try {
      const response = await axios.post(`${BASE_URL}/api/teams/validate`, { sessionId, teamName, password });
      return { success: true, isValid: response.data.isValid };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

  getSessionTeams: async (sessionId) => {
  try {
    const res = await axios.get(`${BASE_URL}/api/teams/session/${sessionId}`);
    return { success: true, data: res.data };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.error || err.message || 'Unknown error',
    };
  }
},


  /* ---------------- PLAYER ROUTES ---------------- */

  // Create a player
  createPlayer: async (sessionId, teamId, playerName, joinMode) => {
    try {
      const response = await axios.post(`${BASE_URL}/api/players`, { sessionId, teamId, playerName, joinMode });
      return { success: true, playerId: response.data.playerId };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

  // Get player info with team
getPlayerWithTeamInfo: async (sessionId, playerName) => {
  try {
    const res = await axios.get(`${BASE_URL}/api/players/${sessionId}/${playerName}`)
    return res.data
  } catch (err) {
    return { success: false, error: err.message }
  }
},


  getPlayersInSession: async (sessionId) => {
  try {
    const response = await axios.get(`${BASE_URL}/api/players/${sessionId}`);
    return { success: true, players: response.data };
  } catch (error) {
    return { success: false, error: error.response?.data?.error || error.message, players: [] };
  }
},

deletePlayer: async (playerId) => {
  try {
    const res = await axios.delete(`${BASE_URL}/api/players/${playerId}`);
    return { success: true, data: res.data };
  } catch (err) {
    console.error("Delete player failed:", err);
    return {
      success: false,
      error: err.response?.data?.error || err.message || 'Server error',
    };
  }
},




  /* ---------------- TAP ORDER ROUTES ---------------- */

  // Record a tap
  addTap: async (sessionId, playerName, teamName, round) => {
    try {
      const response = await axios.post(`${BASE_URL}/api/taps`, { sessionId, playerName, teamName, round });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

  // Get tap order for a round
  getTapOrder: async (sessionId, round) => {
    try {
      const response = await axios.get(`${BASE_URL}/api/taps/${sessionId}/${round}`);
      return { success: true, taps: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || error.message, taps: [] };
    }
  },

  // Clear all taps for a session
  clearTapOrder: async (sessionId) => {
    try {
      const response = await axios.delete(`${BASE_URL}/api/taps/${sessionId}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  },

  deleteRowsByColumn: async (sheetName, columnName, value) => {
    try {
      const res = await axios.delete(`${BASE_URL}/api/sheets/${sheetName}/column/${columnName}/value/${value}`);
      return res.data;
    } catch (err) {
      console.error("API error:", err);
      return { success: false, error: err.message };
    }
  },
};

export default api;