// Import the Client class from the discord.js library
const { Client, GatewayIntentBits } = require('discord.js');

// Replace 'YOUR_BOT_TOKEN_HERE' with your actual bot token
const token = 'MTQ0MzMxNjg0MDMzOTIxMDM1Mw.GNrsSy.m6VwB8k1_6XUufgzWe4lhxEz_QbaNP1YehYA5A'; 

// Create a new client instance with necessary intents
// Intents tell Discord which events your bot needs to listen to.
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, // Required for basic guild information
        GatewayIntentBits.GuildMessages, // Required to receive messages in guilds
        GatewayIntentBits.MessageContent, // Required to access the content of messages
    ] 
});

// Event: The bot is ready and logged in
client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}!`);
    console.log("The bot is now online and running.");
});

// Event: Listen for incoming messages
client.on('messageCreate', message => {
    // Ignore messages from the bot itself
    if (message.author.bot) return;

    // Check if the message content is exactly "!ping"
    if (message.content === '!ping') {
        // Send "Pong!" back to the same channel
        message.channel.send('Pong!');
    }
});

// Log in to Discord with your client's token
client.login(token);
