require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

const app = express();
app.use(express.json());

// --- ASSIGN ROLE ENDPOINT (updated matching logic) ---
app.post("/assign-role", async (req, res) => {
  const { discordUsername, role } = req.body;

  if (!discordUsername || !role) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const guild = client.guilds.cache.first(); // OR use: client.guilds.cache.get('YOUR_GUILD_ID')
  if (!guild) return res.status(500).json({ error: "Guild not found" });

  // ✅ Match both new usernames and legacy tags
  const member = guild.members.cache.find(
    (m) =>
      m.user.username.toLowerCase() === discordUsername.toLowerCase() ||
      m.user.tag?.toLowerCase() === discordUsername.toLowerCase()
  );

  if (!member) {
    return res.status(404).json({ error: "User not found in guild" });
  }

  const roleObj = guild.roles.cache.find(
    (r) => r.name.toLowerCase() === role.toLowerCase()
  );

  if (!roleObj) {
    return res.status(404).json({ error: "Role not found" });
  }

  try {
    await member.roles.add(roleObj);
    console.log(`[✅] Added role ${role} to ${discordUsername}`);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[❌] Role add failed:", err);
    return res.status(500).json({ error: err.message });
  }
});

// Optional status check
app.get("/", (req, res) => {
  res.send("Bot is alive 🚀");
});

client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_BOT_TOKEN);

// Render default port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`HTTP server running on port ${PORT}`));

