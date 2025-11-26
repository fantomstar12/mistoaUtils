// deploy-commands.js
const { REST, Routes, ApplicationCommandOptionType } = require('discord.js');

// IMPORTANT: Replace this placeholder with your actual bot's Client ID (Application ID)!
const CLIENT_ID = '1443316840339210353'; 

// The script will try to read the token from your local environment variables.
// You can set this temporarily in your terminal for the run: export DISCORD_TOKEN="your_token_here"
const TOKEN = process.env.DISCORD_TOKEN; 

if (!CLIENT_ID || CLIENT_ID === 'YOUR_BOT_CLIENT_ID') {
    console.error("ERROR: Please replace 'YOUR_BOT_CLIENT_ID' with your actual bot Client ID.");
    process.exit(1);
}

if (!TOKEN) {
    console.error("ERROR: DISCORD_TOKEN environment variable not set. Please set it before running.");
    process.exit(1);
}

const commands = [
    {
        name: 'ban',
        description: 'Bans a user.',
        options: [
            {
                name: 'user',
                type: ApplicationCommandOptionType.User,
                description: 'The user to ban',
                required: true,
            },
            {
                name: 'reason',
                type: ApplicationCommandOptionType.String,
                description: 'The reason for the ban',
                required: false,
            },
        ],
    },
    {
        name: 'kick',
        description: 'Kicks a user.',
        options: [
            {
                name: 'user',
                type: ApplicationCommandOptionType.User,
                description: 'The user to kick',
                required: true,
            },
            {
                name: 'reason',
                type: ApplicationCommandOptionType.String,
                description: 'The reason for the kick',
                required: false,
            },
        ],
    },
    {
        name: 'mute',
        description: 'Mutes (times out) a user.',
        options: [
            {
                name: 'user',
                type: ApplicationCommandOptionType.User,
                description: 'The user to mute',
                required: true,
            },
            {
                name: 'duration',
                type: ApplicationCommandOptionType.Integer,
                description: 'Duration in seconds (e.g., 600 for 10 minutes)',
                required: true,
            },
            {
                name: 'reason',
                type: ApplicationCommandOptionType.String,
                description: 'The reason for the mute',
                required: false,
            },
        ],
    },
    {
        name: 'timeout',
        description: 'Applies a timeout to a user.',
        options: [
            {
                name: 'user',
                type: ApplicationCommandOptionType.User,
                description: 'The user to timeout',
                required: true,
            },
            {
                name: 'duration',
                type: ApplicationCommandOptionType.Integer,
                description: 'Duration in seconds (e.g., 3600 for 1 hour)',
                required: true,
            },
            {
                name: 'reason',
                type: ApplicationCommandOptionType.String,
                description: 'The reason for the timeout',
                required: false,
            },
        ],
    },
    {
        name: 'purge',
        description: 'Deletes a number of messages from the channel (1-100).',
        options: [
            {
                name: 'amount',
                type: ApplicationCommandOptionType.Integer,
                description: 'The number of messages to delete (max 100)',
                required: true,
            },
        ],
    },
    {
        name: 'ping',
        description: 'Checks the bot latency.',
    },
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands globally.`);

        // Registers commands globally to Discord API
        const data = await rest.put(
            Routes.applicationCommands(CLIENT_ID), 
            { body: commands },
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error("Failed to deploy commands:", error);
    }
})();
