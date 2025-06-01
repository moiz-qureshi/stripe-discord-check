const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const crypto = require('crypto');

// 🔐 Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Helper to buffer raw request body for Stripe signature validation
 */
async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Vercel webhook handler
 */
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const sig = req.headers['stripe-signature'];
  const buf = await buffer(req);
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    console.error('❌ Stripe signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 🔁 Supabase deduplication
  const { data: existing } = await supabase
    .from('processed_events')
    .select('id')
    .eq('id', event.id)
    .maybeSingle();

  if (existing) {
    console.log("⚠️ Duplicate event detected via Supabase:", event.id);
    return res.status(200).send('Already processed');
  }

  await supabase.from('processed_events').insert({ id: event.id });

  // ✅ Handle successful payment
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { discordUsername, platform, email, gamerTag } = session.metadata;

    console.log(`✅ Payment received for ${discordUsername} (${email})`);

    // Normalize usernames by converting both to lowercase
    const normalizedDiscordUsername = discordUsername.toLowerCase();

    // Try to find the member in the Discord guild
    const guild = client.guilds.cache.first(); // Or use a specific guild ID
    if (!guild) {
      console.error("❌ Guild not found.");
      return res.status(500).send('Guild not found');
    }

    const member = guild.members.cache.find(m => m.user.username.toLowerCase() === normalizedDiscordUsername);

    if (!member) {
      console.log(`❌ User ${discordUsername} not found in the guild`);
      return res.status(404).json({ error: "User not found in guild" });
    }

    // Hardcode the role name
    const roleObj = guild.roles.cache.find(r => r.name.toLowerCase() === 'vip clan member');
    if (!roleObj) {
      console.error('❌ Role not found: VIP CLAN MEMBER');
      return res.status(404).json({ error: "Role not found" });
    }

    try {
      await member.roles.add(roleObj);
      console.log(`[✅] Added role VIP CLAN MEMBER to ${discordUsername}`);
      
      // Send success message to Discord
      const channel = guild.channels.cache.find(ch => ch.name === "general" && ch.isTextBased());
      if (channel) {
        channel.send(`🎉 <@${member.user.id}> just became a **VIP Clan Member**! Welcome to the elite.`);
      }

      return res.status(200).send('Webhook received and role assigned');
    } catch (err) {
      console.error("❌ Error assigning role:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(200).send('Webhook received');
};

// Required for raw body parsing in Vercel
export const config = {
  api: {
    bodyParser: false,
  },
};
