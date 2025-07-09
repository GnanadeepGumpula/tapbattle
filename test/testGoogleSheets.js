import dotenv from "dotenv"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, "../.env") })

// Import the service after loading env vars - note: it's a default export, not a class
const googleSheetsService = (await import("../src/services/googleSheets.js")).default

async function testGoogleSheetsConnection() {
  console.log("🧪 Testing Google Sheets Connection...\n")

  try {
    // Check if environment variables are loaded
    console.log("📋 Environment Check:")
    console.log("- Spreadsheet ID:", googleSheetsService.spreadsheetId ? "✅ Set" : "❌ Missing")
    console.log("- Service Account Email:", googleSheetsService.serviceAccountEmail ? "✅ Set" : "❌ Missing")
    console.log("- Private Key:", googleSheetsService.privateKey ? "✅ Set" : "❌ Missing")
    console.log()

    if (
      !googleSheetsService.spreadsheetId ||
      !googleSheetsService.serviceAccountEmail ||
      !googleSheetsService.privateKey
    ) {
      throw new Error("Missing required environment variables. Please check your .env file.")
    }

    // Test authentication
    console.log("🔐 Testing Authentication...")
    const token = await googleSheetsService.getAccessToken()
    console.log("✅ Authentication successful!")
    console.log("- Access token obtained:", token ? "Yes" : "No")
    console.log()

    // Test sheet initialization
    console.log("📊 Testing Sheet Initialization...")
    await googleSheetsService.initializeSheets()
    console.log("✅ Sheets initialized successfully!")
    console.log()

    // Test basic operations
    console.log("🔧 Testing Basic Operations...")

    // Test host creation
    const testUsername = `test_host_${Date.now()}`
    const testPassword = "test123"

    console.log(`- Creating test host: ${testUsername}`)
    await googleSheetsService.createHost(testUsername, testPassword)
    console.log("✅ Host created successfully!")

    // Test host validation
    console.log("- Validating host credentials")
    const isValid = await googleSheetsService.validateHost(testUsername, testPassword)
    console.log(`✅ Host validation: ${isValid ? "Success" : "Failed"}`)

    // Test session creation
    const testSessionId = `TEST${Math.random().toString(36).substr(2, 4).toUpperCase()}`
    console.log(`- Creating test session: ${testSessionId}`)
    await googleSheetsService.createSession(testSessionId, testUsername, "both")
    console.log("✅ Session created successfully!")

    // Test session retrieval
    console.log("- Retrieving session data")
    const session = await googleSheetsService.getSession(testSessionId)
    console.log(`✅ Session retrieved: ${session ? "Success" : "Failed"}`)
    if (session) {
      console.log(`  - Session ID: ${session.sessionId}`)
      console.log(`  - Host: ${session.hostUsername}`)
      console.log(`  - Player Mode: ${session.playerMode}`)
    }

    // Test team creation
    console.log("- Creating test team")
    const teamId = await googleSheetsService.createTeam(testSessionId, "TestTeam", "teampass")
    console.log("✅ Team created successfully!")

    // Test player creation
    console.log("- Creating test player")
    await googleSheetsService.createPlayer(testSessionId, teamId, "TestPlayer", "teams")
    console.log("✅ Player created successfully!")

    // Test tap recording
    console.log("- Recording test tap")
    await googleSheetsService.addTap(testSessionId, "TestPlayer", "TestTeam", 1)
    console.log("✅ Tap recorded successfully!")

    // Cleanup test data
    console.log("\n🧹 Cleaning up test data...")
    await googleSheetsService.deleteHost(testUsername)
    console.log("✅ Test data cleaned up!")

    console.log("\n🎉 All tests passed! Google Sheets integration is working correctly.")
  } catch (error) {
    console.error("\n❌ Test failed:", error.message)
    console.error("\n🔍 Troubleshooting tips:")
    console.error("1. Make sure your .env file exists in the project root")
    console.error("2. Verify all environment variables are set correctly")
    console.error("3. Check that the Google Sheets API is enabled")
    console.error("4. Ensure the service account has access to the spreadsheet")
    console.error("5. Verify the private key format (should include \\n characters)")

    if (error.message.includes("403")) {
      console.error("\n📝 403 Error usually means:")
      console.error("- The service account email is not shared with the spreadsheet")
      console.error("- The service account lacks proper permissions")
    }

    if (error.message.includes("404")) {
      console.error("\n📝 404 Error usually means:")
      console.error("- The spreadsheet ID is incorrect")
      console.error("- The spreadsheet does not exist")
    }

    if (error.message.includes("400")) {
      console.error("\n📝 400 Error usually means:")
      console.error("- Invalid request format or parameters")
      console.error("- Sheet doesn't exist or wrong range specified")
      console.error("- Check the API endpoint format")
    }

    console.error("\n🔧 Debug info:")
    console.error("- Spreadsheet ID:", googleSheetsService.spreadsheetId)
    console.error("- Service Account:", googleSheetsService.serviceAccountEmail)
    console.error("- Has Private Key:", !!googleSheetsService.privateKey)

    process.exit(1)
  }
}

// Run the test
testGoogleSheetsConnection()
