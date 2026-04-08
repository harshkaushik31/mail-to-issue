import fs          from "fs";
import path        from "path";
import http        from "http";
import { google }  from "googleapis";
import open        from "open";

const SCOPES     = ["https://www.googleapis.com/auth/gmail.modify"];
const TOKEN_PATH = path.resolve("token.json");
const CREDS_PATH = path.resolve("credentials.json");
const PORT       = 3000;
const REDIRECT   = `http://localhost:${PORT}/oauth2callback`;

// OAuth code capture via local server
function getAuthCodeViaLocalServer(oAuth2Client) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url    = new URL(req.url, `http://localhost:${PORT}`);
      const code   = url.searchParams.get("code");
      const error  = url.searchParams.get("error");

      if (error) {
        res.end(`<h2>Authentication failed: ${error}</h2><p>You can close this tab.</p>`);
        server.close();
        return reject(new Error(`OAuth error: ${error}`));
      }

      if (!code) {
        res.end("<h2>No code received.</h2><p>Try running npm run auth again.</p>");
        server.close();
        return reject(new Error("No auth code in redirect"));
      }

      res.end(`
        <h2>✅ Authentication successful!</h2>
        <p>You can close this tab and return to your terminal.</p>
      `);
      server.close();
      resolve(code);
    });

    server.listen(PORT, async () => {
      const authUrl = oAuth2Client.generateAuthUrl({
        access_type: "offline",
        scope:       SCOPES,
        prompt:      "consent",   
      });

      console.log(`\n🔐 Opening your browser for Gmail authorisation…`);
      console.log(`   If it doesn't open automatically, visit:\n   ${authUrl}\n`);

      try {
        await open(authUrl);
      } catch {
        // open() 
      }
    });

    server.on("error", reject);
  });
}

// Main exported helper 

export async function getGmailClient() {
  if (!fs.existsSync(CREDS_PATH)) {
    throw new Error(
      "credentials.json not found.\n" +
      "Download it from Google Cloud Console → APIs & Services → Credentials\n" +
      "and save it as credentials.json in the project root."
    );
  }

  const { client_secret, client_id } = JSON.parse(
    fs.readFileSync(CREDS_PATH, "utf8")
  ).installed;

  
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, REDIRECT);


  if (fs.existsSync(TOKEN_PATH)) {
    const stored = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
    oAuth2Client.setCredentials(stored);


    oAuth2Client.on("tokens", (fresh) => {
      const merged = { ...stored, ...fresh };
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(merged, null, 2));
    });

    return oAuth2Client;
  }

  // First-time authorisation 
  const code           = await getAuthCodeViaLocalServer(oAuth2Client);
  const { tokens }     = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));

  console.log("✅ token.json saved — you won't need to do this again.\n");
  return oAuth2Client;
}

// Run directly via `npm run auth`
if (process.argv[1].endsWith("auth.js")) {
  await getGmailClient();
  console.log("Authentication complete!");
  process.exit(0);
}