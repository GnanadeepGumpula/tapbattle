import dotenv from "dotenv"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, "../.env") })

async function debugGoogleSheets() {
  console.log("🔍 Debug Google Sheets API...\n")

  const spreadsheetId = process.env.VITE_GOOGLE_SPREADSHEET_ID
  const serviceAccountEmail = process.env.VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.VITE_GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n")

  console.log("Environment Variables:")
  console.log("- Spreadsheet ID:", spreadsheetId ? `${spreadsheetId.substring(0, 10)}...` : "❌ Missing")
  console.log("- Service Email:", serviceAccountEmail ? "✅ Set" : "❌ Missing")
  console.log("- Private Key:", privateKey ? "✅ Set" : "❌ Missing")
  console.log()

  if (!spreadsheetId || !serviceAccountEmail || !privateKey) {
    console.error("❌ Missing environment variables!")
    return
  }

  try {
    // Test 1: Get access token
    console.log("🔐 Step 1: Getting access token...")
    const token = await getAccessToken(serviceAccountEmail, privateKey)
    console.log("✅ Access token obtained")
    console.log()

    // Test 2: Check if spreadsheet exists
    console.log("📊 Step 2: Checking spreadsheet access...")
    const spreadsheetInfo = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!spreadsheetInfo.ok) {
      throw new Error(`Cannot access spreadsheet: ${spreadsheetInfo.status} ${spreadsheetInfo.statusText}`)
    }

    const info = await spreadsheetInfo.json()
    console.log("✅ Spreadsheet accessible")
    console.log(`- Title: ${info.properties.title}`)
    console.log(`- Sheets: ${info.sheets.map((s) => s.properties.title).join(", ")}`)
    console.log()

    // Test 3: Check if Hosts sheet exists
    console.log("📋 Step 3: Checking Hosts sheet...")
    const hostsSheet = info.sheets.find((s) => s.properties.title === "Hosts")

    if (!hostsSheet) {
      console.log("⚠️ Hosts sheet doesn't exist, creating it...")
      await createSheet(spreadsheetId, token, "Hosts")
      await initializeHeaders(spreadsheetId, token, "Hosts", ["username", "password", "createdAt"])
      console.log("✅ Hosts sheet created")
    } else {
      console.log("✅ Hosts sheet exists")
    }
    console.log()

    // Test 4: Try to append data
    console.log("📝 Step 4: Testing data append...")
    const testData = [`test_user_${Date.now()}`, "test123", new Date().toISOString()]

    const appendResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Hosts!A:C:append?valueInputOption=RAW`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values: [testData],
        }),
      },
    )

    if (!appendResponse.ok) {
      const errorText = await appendResponse.text()
      throw new Error(`Append failed: ${appendResponse.status} ${appendResponse.statusText}\n${errorText}`)
    }

    console.log("✅ Data append successful!")
    console.log(`- Added: ${testData.join(", ")}`)
    console.log()

    // Test 5: Read the data back
    console.log("📖 Step 5: Reading data back...")
    const readResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Hosts!A:C`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )

    const readData = await readResponse.json()
    console.log("✅ Data read successful!")
    console.log(`- Rows: ${readData.values?.length || 0}`)
    if (readData.values && readData.values.length > 0) {
      console.log(`- Last row: ${readData.values[readData.values.length - 1].join(", ")}`)
    }

    console.log("\n🎉 All debug tests passed!")
  } catch (error) {
    console.error("\n❌ Debug failed:", error.message)
    console.error("\nFull error:", error)
  }
}

async function getAccessToken(serviceAccountEmail, privateKey) {
  const header = { alg: "RS256", typ: "JWT" }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: serviceAccountEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }

  const encodedHeader = btoa(JSON.stringify(header)).replace(/[+/=]/g, (m) => ({ "+": "-", "/": "_", "=": "" })[m])
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/[+/=]/g, (m) => ({ "+": "-", "/": "_", "=": "" })[m])

  const signatureInput = `${encodedHeader}.${encodedPayload}`

  // Import the private key
  const privateKeyBuffer = pemToArrayBuffer(privateKey)
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  )

  // Sign the JWT
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(signatureInput))
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(
    /[+/=]/g,
    (m) => ({ "+": "-", "/": "_", "=": "" })[m],
  )

  const jwt = `${signatureInput}.${encodedSignature}`

  // Exchange JWT for access token
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  })

  const data = await response.json()
  if (!data.access_token) {
    throw new Error(`Failed to get access token: ${JSON.stringify(data)}`)
  }

  return data.access_token
}

function pemToArrayBuffer(pem) {
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

async function createSheet(spreadsheetId, token, sheetName) {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [{ addSheet: { properties: { title: sheetName } } }],
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to create sheet: ${response.status}`)
  }
}

async function initializeHeaders(spreadsheetId, token, sheetName, headers) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:${String.fromCharCode(64 + headers.length)}1?valueInputOption=RAW`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [headers] }),
    },
  )

  if (!response.ok) {
    throw new Error(`Failed to set headers: ${response.status}`)
  }
}

// Run debug
debugGoogleSheets()
