#!/usr/bin/env node

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log("🚀 Setting up TapBattle Test Environment...\n")

// Check if .env file exists
const envPath = path.join(__dirname, "../.env")
const envExamplePath = path.join(__dirname, "../.env.example")

if (!fs.existsSync(envPath)) {
  console.log("📝 Creating .env file from template...")

  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath)
    console.log("✅ .env file created!")
    console.log("⚠️  Please edit the .env file with your actual Google Sheets credentials.")
  } else {
    // Create a basic .env template
    const envTemplate = `# Google Sheets API Configuration
VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
VITE_GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nYOUR_PRIVATE_KEY_HERE\\n-----END PRIVATE KEY-----"
VITE_GOOGLE_SPREADSHEET_ID=your_spreadsheet_id_here

# Instructions:
# 1. Replace the service account email with your actual service account email
# 2. Replace the private key with your actual private key (keep the quotes and \\n characters)
# 3. Replace the spreadsheet ID with your actual Google Sheets ID
# 4. Make sure to share your Google Sheet with the service account email
`

    fs.writeFileSync(envPath, envTemplate)
    console.log("✅ .env template created!")
  }
} else {
  console.log("✅ .env file already exists")
}

// Install test dependencies
console.log("\n📦 Installing test dependencies...")
try {
  const { execSync } = await import("child_process")

  // Check if we're in the test directory
  const testDir = path.join(__dirname, "../test")
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true })
  }

  process.chdir(testDir)

  if (!fs.existsSync("package.json")) {
    console.log("Creating test package.json...")
    const packageJson = {
      name: "tapbattle-test",
      type: "module",
      scripts: {
        test: "node testGoogleSheets.js",
      },
      dependencies: {
        dotenv: "^16.3.1",
      },
    }
    fs.writeFileSync("package.json", JSON.stringify(packageJson, null, 2))
  }

  execSync("npm install", { stdio: "inherit" })
  console.log("✅ Test dependencies installed!")
} catch (error) {
  console.log("⚠️  Please install test dependencies manually:")
  console.log("   cd test && npm install")
}

console.log("\n🎯 Setup complete! Next steps:")
console.log("1. Edit the .env file with your Google Sheets credentials")
console.log("2. Run the test: cd test && npm test")
console.log("3. If tests pass, your integration is ready!")

console.log("\n📚 Need help setting up Google Sheets? Check GOOGLE_SHEETS_SETUP.md")
