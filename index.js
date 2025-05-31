require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

const app = express();
app.use(express.json());

// --- ASSIGN ROLE ENDPOINT with live fetch and hardcoded role ---
app.post("/assign-role", async (req, res) => {
  const { discordUsername } = req.body;

  if (!discordUsername) {
    return res.status(400).json({ error: "Missing discordUsername" });
  }

  const guild = client.guilds.cache.first(); // Or client.guilds.cache.get('YOUR_GUILD_ID')
  if (!guild) return res.status(500).json({ error: "Guild not found" });

  try {
    // ✅ Fetch all members to ensure full list is available
    const fetchedMembers = await guild.members.fetch();
    console.log(`📥 Fetched ${fetchedMembers.size} members`);

    // 🔍 Search for the user using multiple possible fields
    const member = fetchedMembers.find(
      (m) =>
        m.user.username.toLowerCase() === discordUsername.toLowerCase() ||
        m.user.tag?.toLowerCase() === discordUsername.toLowerCase() ||
        m.displayName?.toLowerCase() === discordUsername.toLowerCase()
    );

    console.log("🧪 Searching for:", discordUsername);
    console.log("🧪 Found member:", member?.user?.tag || "Not found");

    if (!member) {
      return res.status(404).json({ error: "User not found in guild" });
    }

    // ✅ Hardcoded role name
    console.log("🎯 Using hardcoded role: VIP CLAN MEMBER");

    const roleObj = guild.roles.cache.find(
      (r) => r.name.toLowerCase() === "vip clan member"
    );

    if (!roleObj) {
      console.error("❌ Role not found: VIP CLAN MEMBER");
      return res.status(404).json({ error: "Role not found" });
    }

    await member.roles.add(roleObj);
    console.log(`[✅] Added role VIP CLAN MEMBER to ${discordUsername}`);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Failed during member fetch or role assignment:", err);
    return res.status(500).json({ error: err.message });
  }
});

// --- Root health check ---
app.get("/", (req, res) => {
  res.send("Bot is alive 🚀");
});

// --- Start bot ---
client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_BOT_TOKEN);

// --- Start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`HTTP server running on port ${PORT}`));

