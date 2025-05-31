require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();

// Discord client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

app.use(express.json());

// --- ASSIGN ROLE ENDPOINT (updated username logic) ---
app.post("/assign-role", async (req, res) => {
  const { discordUsername, role } = req.body;

  if (!discordUsername || !role) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const guild = client.guilds.cache.first(); // Or .get('YOUR_GUILD_ID')
  if (!guild) return res.status(500).json({ error: "Guild not found" });

  // ✅ Support both new username and old tag format
  const member = guild.members.cache.find(
    (m) =>
      m.user.username.toLowerCase() === discordUsername.toLowerCase() ||
      m.user.tag?.toLowerCase() === discordUsername.toLowerCase()
  );

  if (!member) return res.status(404).json({ error: "User not found in guild" });

  const roleObj = guild.roles.cache.find(
    (r) => r.name.toLowerCase() === role.toLowerCase()
  );
  if (!roleObj) return res.status(404).json({ error: "Role not found" });

  try {
    await member.roles.add(roleObj);
    console.log(`[✅] Added role ${role} to ${discordUsername}`);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[❌] Role add failed:", err);
    return res.status(500).json({ error: err.message });
  }
});

// --- STRIPE WEBHOOK ENDPOINT (unchanged) ---
app.post(
  "/stripe-webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error("❌ Stripe webhook signature failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const { discordUsername, platform, email, gamerTag } = session.metadata;

      console.log(`✅ Stripe payment received from ${discordUsername}`);
    }

    res.status(200).send("Webhook received");
  }
);

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

