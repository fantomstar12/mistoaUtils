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

            // 1. Password Protection Check (CRITICAL SERVER-SIDE CHECK)
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
    // Serve the simple dashboard form on GET requests (WITH CSS and LOGIN)
    else if (reqUrl.pathname === '/' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Bot Dashboard</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        background-color: #f4f4f9; 
                        color: #333; 
                        padding: 20px;
                        line-height: 1.6;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                    }
                    .container {
                        max-width: 500px;
                        width: 100%;
                    }
                    h1 {
                        color: #5865f2;
                        border-bottom: 2px solid #5865f2;
                        padding-bottom: 10px;
                        text-align: center;
                    }
                    h2 {
                        color: #5865f2;
                        text-align: center;
                        margin-bottom: 20px;
                    }
                    form, #login-screen {
                        background: white;
                        padding: 20px;
                        border-radius: 8px;
                        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                        margin-top: 20px;
                    }
                    label {
                        display: block;
                        margin-bottom: 5px;
                        font-weight: bold;
                        color: #555;
                    }
                    input[type="text"], 
                    input[type="password"], 
                    textarea {
                        width: 100%;
                        padding: 10px;
                        margin-bottom: 15px;
                        border: 1px solid #ccc;
                        border-radius: 4px;
                        box-sizing: border-box; 
                    }
                    textarea {
                        resize: vertical;
                    }
                    button, input[type="submit"] {
                        background-color: #5865f2;
                        color: white;
                        padding: 10px 15px;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 16px;
                        transition: background-color 0.3s ease;
                        display: block;
                        width: 100%;
                        margin-top: 10px;
                    }
                    button:hover, input[type="submit"]:hover {
                        background-color: #4752c4;
                    }
                    #logout-button {
                        background-color: #f04747;
                        margin-top: 20px;
                    }
                    #logout-button:hover {
                        background-color: #c93b3b;
                    }
                    p {
                        margin-top: 20px;
                        font-size: 0.9em;
                        color: #777;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div id="login-screen">
                        <h2>Teahouse Admin Login</h2>
                        <form id="login-form">
                            <label for="login-password">Password:</label>
                            <input type="password" id="login-password" required>
                            <button type="submit">Sign In</button>
                            <p id="login-message" style="margin-top: 10px; text-align: center;"></p>
                        </form>
                    </div>

                    <div id="admin-panel" style="display: none;">
                        <h1>TeahouseAdmin Bot Dashboard</h1>
                        <p>Welcome, Moderator. Use the form below to send a message as the bot.</p>
                        
                        <form method="POST" action="/sendmessage">
                            <!-- Hidden input to carry the password for server-side validation -->
                            <input type="hidden" id="auth-password" name="password">

                            <label for="channelId">Channel ID:</label>
                            <input type="text" id="channelId" name="channelId" required placeholder="e.g., 123456789012345678"><br>
                            
                            <label for="message">Message:</label>
                            <textarea id="message" name="message" required rows="5" cols="50"></textarea><br>
                            
                            <input type="submit" value="Send Message to Channel">
                        </form>
                        <button id="logout-button" onclick="logout()">Sign Out</button>
                        <p><strong>Note:</strong> Channel ID can be copied by enabling Discord Developer Mode.</p>
                    </div>
                </div>

                <script>
                    // IMPORTANT: The password is also defined here for the client-side UI gate. 
                    // Server-side validation is still mandatory and implemented in the Node.js POST route.
                    const ADMIN_PASSWORD_CLIENT = '${ADMIN_PASSWORD}'; 

                    const loginScreen = document.getElementById('login-screen');
                    const adminPanel = document.getElementById('admin-panel');
                    const loginForm = document.getElementById('login-form');
                    const loginPasswordInput = document.getElementById('login-password');
                    const loginMessage = document.getElementById('login-message');
                    const authPasswordInput = document.getElementById('auth-password');

                    loginForm.addEventListener('submit', function(e) {
                        e.preventDefault();
                        const passwordInput = loginPasswordInput.value;

                        if (passwordInput === ADMIN_PASSWORD_CLIENT) {
                            // Success: Hide login, show panel, and set the password field for POST requests
                            loginScreen.style.display = 'none';
                            adminPanel.style.display = 'block';
                            authPasswordInput.value = passwordInput; 
                            loginMessage.textContent = '';
                            loginMessage.style.color = 'inherit';
                        } else {
                            // Failure: Show error message
                            loginMessage.textContent = '❌ Invalid password. Please try again.';
                            loginMessage.style.color = 'red';
                        }
                    });

                    function logout() {
                        authPasswordInput.value = '';
                        loginScreen.style.display = 'block';
                        adminPanel.style.display = 'none';
                        loginPasswordInput.value = ''; // Clear password field
                        loginMessage.textContent = 'Signed out successfully.';
                        loginMessage.style.color = 'green';
                    }
                </script>
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
    const member = interaction.member; 

    // --- A. Role and Permission Check for All Moderation Commands ---
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
        // Must also check for the necessary Discord permission for purge ('Manage Messages')
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
