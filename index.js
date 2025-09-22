// Require the necessary discord.js classes
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, AttachmentBuilder } = require('discord.js');
const { token } = require('./config.json');

let harper_attitude_value = 50;

exports.harper_attitude_value = harper_attitude_value;

// List of replies harper gives
const neutral_replies = ["Woof","Bark","Ruff","Woof woof","😐"];
const angry_replies = ["I hate you","Grr","I don't want to talk to you","Please kill me","😡"];
const happy_replies = ["I love you!","Woof!","Bark!","Bark bark!","😄"];

const good_words = ["love","like","good boy","great","awesome","best","amazing","fantastic","nice","wonderful","incredible","fabulous","brilliant","superb","excellent","w harper"];

//Gets a list of bad words from bad-words.js file
const { bad_words } = require('./bad-words.js');

//List of all image files in harper_images folder (will be populated at runtime)
const image_replies = [];

const IMAGES_DIR = path.join(__dirname, 'harper_images');
const ALLOWED_EXT = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];

function loadImages() {
  try {
    const files = fs.readdirSync(IMAGES_DIR);
    const images = files.filter(f => ALLOWED_EXT.includes(path.extname(f).toLowerCase()))
                        .map(f => path.join(IMAGES_DIR, f));
    // replace contents of image_replies in-place so references remain valid
    image_replies.length = 0;
    image_replies.push(...images);
    console.log(`Loaded ${image_replies.length} images from ${IMAGES_DIR}`);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log(`${IMAGES_DIR} does not exist — no images loaded.`);
    } else {
      console.error('Error loading images:', err);
    }
  }
}

// Initial load of images
loadImages();


// Create a new client instance
// Include message-related intents and message content intent so the bot can read message text.
// Add partials to receive direct messages (DMs).
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: ['CHANNEL'],
});

client.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
		}
	}
});

const arrows = ['⬆️','⬇️'];
let losing_attitude = 0;

client.on('messageCreate', (message) => {
  // Ignore messages from bots and messages without text content (e.g., embeds or system messages)
  if (!message || !message.content || message.author.bot) return;

  // Case-insensitive substring check for "harper"
  if (message.content.toLowerCase().includes('harper')) {

    // if message contains any words in bad words list, decrease attitude by 5
    if (bad_words.some(word => message.content.toLowerCase().includes(word))) {
      harper_attitude_value -= 5;
      losing_attitude = 1;
    }
    else if (good_words.some(word => message.content.toLowerCase().includes(word))) {
      harper_attitude_value += 3;
      losing_attitude = 0;
    }
    else {
      harper_attitude_value += 1;
      losing_attitude = 0;
    }


    if (harper_attitude_value < 30) {
        message.reply(angry_replies[Math.floor(Math.random() * angry_replies.length)]);
    }

    else if (harper_attitude_value >= 30 && harper_attitude_value <= 70) {
      //1 in 4 chance of replying with an image
      if (Math.random() < 0.25) {
        const chosen = image_replies[Math.floor(Math.random() * image_replies.length)];
        const attachment = new AttachmentBuilder(chosen);
        message.reply({ files: [attachment] });
      } else {
        message.reply(neutral_replies[Math.floor(Math.random() * neutral_replies.length)]);
      }
    }

    else if (harper_attitude_value > 70) {
        message.reply(happy_replies[Math.floor(Math.random() * happy_replies.length)]);
    }
    
     // Clamp attitude value between 0 and 100
    if (harper_attitude_value < 0) harper_attitude_value = 0;
    if (harper_attitude_value > 100) harper_attitude_value = 100;
    message.channel.send('Harper\'s current attitude value is: ' + harper_attitude_value + ' ' + arrows[losing_attitude]);
   
  }
});

// Log in to Discord with your client's token
client.login(token);