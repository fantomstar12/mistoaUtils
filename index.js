// Import discord.js and other necessary modules
const { 
    Client, 
    GatewayIntentBits, 
    PermissionsBitField, 
    EmbedBuilder,
    ChannelType 
} = require('discord.js');
const http = require('http');   // For the simple dashboard server
const url = require('url');     // For parsing URL parameters
const { URLSearchParams } = require('url'); 

// --- Bot Configuration & Secrets ---
// Secrets are read from Render Environment Variables
const TOKEN = process.env.DISCORD_TOKEN;
const LOGGING_CHANNEL_ID = process.env.LOGGING_CHANNEL_ID;
const REQUIRED_ROLE_NAME = "Discord Moderator"; // The specific role name required to use moderation commands

// WARNING: Hardcoded password is provided as requested, but generally unsafe.
const ADMIN_PASSWORD = 'TeahouseAdmin232'; 
const SERVER_PORT = process.env.PORT || 8080; 

// Create the Client instance with required Intents
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
    ] 
});

// ------------------------------------
// ## Logging Function
// ------------------------------------

/**
 * Sends a clean, embedded message to the designated logging channel.
 * @param {EmbedBuilder} embed - The pre-configured Discord Embed.
 */
async function sendLog(embed) {
    if (!LOGGING_CHANNEL_ID) {
        console.log("LOGGING_CHANNEL_ID environment variable is not set. Skipping log.");
        return;
    }
    try {
        const logChannel = await client.channels.fetch(LOGGING_CHANNEL_ID);
        if (logChannel && logChannel.isTextBased()) {
            logChannel.send({ embeds: [embed] });
        }
    } catch (error) {
        console.error('Error sending message to log channel:', error);
    }
}

// ------------------------------------
// ## Dashboard Server Setup
// ------------------------------------

const server = http.createServer(async (req, res) => {
    const reqUrl = url.parse(req.url, true);

    // Handle POST requests to /sendmessage from the dashboard form
    if (reqUrl.pathname === '/sendmessage' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString(); 
        });
        req.on('end', async () => {
            const params = new URLSearchParams(body);
            
            const password = params.get('password');
            const channelId = params.get('channelId');
            const message = params.get('message');

            // 1. Password Protection Check
            if (password !== ADMIN_PASSWORD) {
                res.writeHead(403, { 'Content-Type': 'text/html' });
                res.end('<h1>403 Forbidden: Invalid Password</h1>');
                return;
            }

            // 2. Send Message Logic
            try {
                const channel = await client.channels.fetch(channelId);

                if (!channel || channel.type !== ChannelType.GuildText) {
                    res.writeHead(400, { 'Content-Type': 'text/html' });
                    res.end('<h1>400 Bad Request: Invalid or Non-Text Channel ID</h1>');
                    return;
                }

                await channel.send(message);
                
                // Log the dashboard action
                const dashboardLogEmbed = new EmbedBuilder()
                    .setColor(0x00BFFF) // Deep sky blue
                    .setTitle('🌐 Message Sent via Dashboard')
                    .addFields(
                        { name: 'Channel', value: `<#${channelId}>` },
                        { name: 'Message Preview', value: message.substring(0, 1024) }
                    )
                    .setTimestamp();
                sendLog(dashboardLogEmbed);

                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(`<h1>Message Sent Successfully!</h1><p>Channel: ${channel.name}</p>`);

            } catch (error) {
                console.error('Error sending dashboard message:', error);
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end('<h1>500 Server Error: Could not send message. Check Bot Permissions.</h1>');
            }
        });
    } 
    // Serve the simple dashboard form on GET requests
    else if (reqUrl.pathname === '/' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Bot Dashboard</title>
                <style>body { font-family: sans-serif; }</style>
            </head>
            <body>
                <h1>TeahouseAdmin Bot Dashboard</h1>
                <form method="POST" action="/sendmessage">
                    <label for="password">Password:</label><br>
                    <input type="password" id="password" name="password" required><br><br>
                    <label for="channelId">Channel ID:</label><br>
                    <input type="text" id="channelId" name="channelId" required placeholder="e.g., 123456789012345678"><br><br>
                    <label for="message">Message:</label><br>
                    <textarea id="message" name="message" required rows="5" cols="50"></textarea><br><br>
                    <input type="submit" value="Send Message to Channel">
                </form>
                <p><strong>Note:</strong> Channel ID can be copied by enabling Discord Developer Mode.</p>
            </body>
            </html>
        `);
    } else {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>');
    }
});

// ------------------------------------
// ## Discord Bot Events
// ------------------------------------

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}!`);
    console.log("The bot is now online and running.");
    
    // Start the web server after the bot logs in
    server.listen(SERVER_PORT, () => {
        console.log(`🌐 Dashboard server running on port ${SERVER_PORT}. Access via the public Render URL.`);
    });
});

// Handle Slash Command Interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;
    const moderator = interaction.user;
    const member = interaction.member; // This is the GuildMember object

    // --- A. Role and Permission Check for All Moderation Commands ---
    // Note: 'ping' is excluded from the check
    if (commandName !== 'ping') {
        
        // 1. Check if the user has the required specific role ("Discord Moderator")
        const hasRequiredRole = member.roles.cache.some(role => role.name === REQUIRED_ROLE_NAME);
        
        // 2. Check for Administrator permission as a bypass/fallback
        const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);

        // Deny execution if they don't have the required role AND aren't an admin
        if (!hasRequiredRole && !isAdmin) {
             return interaction.reply({ 
                content: `You need the **${REQUIRED_ROLE_NAME}** role or Administrator permissions to run this command.`, 
                ephemeral: true 
            });
        }
    }

    // --- B. Execute Commands ---
    
    // --- /BAN COMMAND ---
    if (commandName === 'ban') {
        const userToBan = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        try {
            await interaction.guild.members.ban(userToBan, { reason });
            await interaction.reply({ content: `Banned **${userToBan.tag}** for reason: *${reason}*`, ephemeral: false });

            // Send log
            const banLogEmbed = new EmbedBuilder()
                .setColor(0xFF0000) // Red
                .setTitle('🚨 User Banned 🚨')
                .addFields(
                    { name: 'Target User', value: `${userToBan.tag} (\`${userToBan.id}\`)` },
                    { name: 'Moderator', value: `${moderator.tag} (\`${moderator.id}\`)` },
                    { name: 'Reason', value: reason }
                )
                .setTimestamp();
            sendLog(banLogEmbed);

        } catch (error) {
            console.error('Ban failed:', error);
            await interaction.reply({ content: 'Could not ban the user. Check bot permissions and hierarchy.', ephemeral: true });
        }
    } 
    
    // --- /KICK COMMAND ---
    else if (commandName === 'kick') {
        const userToKick = interaction.options.getMember('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        if (!userToKick) {
             return interaction.reply({ content: 'That user is not a member of this server.', ephemeral: true });
        }

        try {
            await userToKick.kick(reason);
            await interaction.reply({ content: `Kicked **${userToKick.user.tag}** for reason: *${reason}*`, ephemeral: false });

            // Send log
            const kickLogEmbed = new EmbedBuilder()
                .setColor(0xFFA500) // Orange
                .setTitle('⚠️ User Kicked ⚠️')
                .addFields(
                    { name: 'Target User', value: `${userToKick.user.tag} (\`${userToKick.user.id}\`)` },
                    { name: 'Moderator', value: `${moderator.tag} (\`${moderator.id}\`)` },
                    { name: 'Reason', value: reason }
                )
                .setTimestamp();

            sendLog(kickLogEmbed);

        } catch (error) {
            console.error('Kick failed:', error);
            await interaction.reply({ content: 'Could not kick the user. Check bot permissions and hierarchy.', ephemeral: true });
        }
    }

    // --- /MUTE & /TIMEOUT COMMANDS (Uses Discord's Timeout) ---
    else if (commandName === 'mute' || commandName === 'timeout') {
        const userToTimeout = interaction.options.getMember('user');
        const durationSeconds = interaction.options.getInteger('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const isMute = commandName === 'mute';

        if (!userToTimeout) {
            return interaction.reply({ content: 'That user is not a member of this server.', ephemeral: true });
        }

        // Convert seconds to milliseconds
        const durationMs = durationSeconds * 1000;
        
        try {
            await userToTimeout.timeout(durationMs, reason);
            
            const durationDisplay = `${Math.floor(durationSeconds / 60)} minutes`; 
            const actionVerb = isMute ? 'Muted' : 'Timed out';

            await interaction.reply({ 
                content: `${actionVerb} **${userToTimeout.user.tag}** for **${durationDisplay}** (Reason: *${reason}*)`, 
                ephemeral: false 
            });

            // Send log
            const timeoutLogEmbed = new EmbedBuilder()
                .setColor(0xFFFF00) // Yellow
                .setTitle(`🔇 User ${actionVerb} 🔇`)
                .addFields(
                    { name: 'Target User', value: `${userToTimeout.user.tag} (\`${userToTimeout.user.id}\`)` },
                    { name: 'Moderator', value: `${moderator.tag} (\`${moderator.id}\`)` },
                    { name: 'Duration', value: durationDisplay },
                    { name: 'Reason', value: reason }
                )
                .setTimestamp();
            
            sendLog(timeoutLogEmbed);

        } catch (error) {
            console.error(`${commandName} failed:`, error);
            await interaction.reply({ content: `Could not ${commandName} the user. Check bot permissions and hierarchy.`, ephemeral: true });
        }
    }
    
    // --- /PURGE COMMAND (Bulk Delete) ---
    else if (commandName === 'purge') {
        // Also check for the necessary Discord permission for purge, which is 'Manage Messages'
        if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
             return interaction.reply({ 
                content: `You must also have the "Manage Messages" permission to use the purge command.`, 
                ephemeral: true 
            });
        }
        
        const amount = interaction.options.getInteger('amount');
        
        if (amount < 1 || amount > 100) {
            return interaction.reply({ content: 'You can only purge between 1 and 100 messages.', ephemeral: true });
        }

        try {
            const fetched = await interaction.channel.messages.fetch({ limit: amount });
            const deleted = await interaction.channel.bulkDelete(fetched, true); 

            await interaction.reply({ 
                content: `Successfully deleted **${deleted.size}** messages.`, 
                ephemeral: true 
            });

            // Send log
            const purgeLogEmbed = new EmbedBuilder()
                .setColor(0x800080) // Purple
                .setTitle('🗑️ Message Purge 🗑️')
                .addFields(
                    { name: 'Channel', value: `<#${interaction.channel.id}>` },
                    { name: 'Amount', value: deleted.size.toString() },
                    { name: 'Moderator', value: `${moderator.tag} (\`${moderator.id}\`)` }
                )
                .setTimestamp();
            
            setTimeout(() => {
                sendLog(purgeLogEmbed);
            }, 3000); 

        } catch (error) {
            console.error('Purge failed:', error);
            await interaction.reply({ content: 'Could not purge messages. Messages older than 14 days cannot be bulk deleted, or check bot permissions.', ephemeral: true });
        }
    }

    // --- /PING COMMAND ---
    else if (commandName === 'ping') {
        await interaction.reply({ content: `Pong! Latency is ${client.ws.ping}ms.`, ephemeral: true });
    }
});

// Start the bot
client.login(TOKEN);
