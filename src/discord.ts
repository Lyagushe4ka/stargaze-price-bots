import { Client, GatewayIntentBits, ButtonBuilder, ButtonStyle } from "discord.js";
import { Collection, getCollections, getSpecificCollection, removeDecimals } from ".";
import { DISCORD_TOKEN } from "../secrets";
import { ActionRowBuilder } from "@discordjs/builders";

const discordClient = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

async function main() {

  discordClient.once('ready', () => {
    console.log('Bot is ready!');
  });

  let collectionsDataHistory: Collection[] = [];

  discordClient.on('messageCreate', async (message) => {
    if (message.author.bot) {
      return;
    }

    if (!message.content.startsWith('!')) {
      return;
    }

    const search = message.content.replace('!', '').trim().toLowerCase().replace(' ', '_');

    let collectionsData = await getCollections(search);

    collectionsData.map((value) => {
      value.timestamp = Date.now();
    });

    if (collectionsDataHistory.length > 30) {
      collectionsDataHistory = collectionsData
    } else {
      for (const collection of collectionsData) {
        const index = collectionsDataHistory.findIndex((value) => value.contractAddress === collection.contractAddress);
        if (index === -1) {
          collectionsDataHistory.push(collection);
        } else {
          collectionsDataHistory[index] = collection;
        }
      }
    }

    if (collectionsData.length === 0) {

      message.reply('No collection found');

    } else if (collectionsData.length > 0 && collectionsData.length < 3) {

      const firstName = `[${collectionsData[0].name}](${`https://www.stargaze.zone/m/${collectionsData[0].contractUri}`}):\n`
      const firstFloor = `Floor: ${removeDecimals(collectionsData[0].floorPrice)} $stars`
      const firstOffer = `${collectionsData[0].highestOffer.price ? `\nHighest offer: ${removeDecimals(collectionsData[0].highestOffer.price ?? 0)} $stars` : ''}`
      const firstWebsite = `${collectionsData[0].website ? `\nWebsite: ${collectionsData[0].website}` : ''}`
      const firstCollectionString = `${firstName}${firstFloor}${firstOffer}${firstWebsite}`

      let secondCollectionString = ''
      if (collectionsData.length === 2) {
        const secondName = `\n\n[${collectionsData[1].name}](${`https://www.stargaze.zone/m/${collectionsData[1].contractUri}`}):\n`
        const secondFloor = `Floor: ${removeDecimals(collectionsData[1].floorPrice)} $stars`
        const secondOffer = `${collectionsData[1].highestOffer.price ? `\nHighest offer: ${removeDecimals(collectionsData[1].highestOffer.price ?? 0)} $stars` : ''}`
        const secondWebsite = `${collectionsData[1].website ? `\nWebsite: ${collectionsData[1].website}` : ''}`
        secondCollectionString = `${secondName}${secondFloor}${secondOffer}${secondWebsite}`
      }

      message.reply(`${firstCollectionString}${secondCollectionString}`);

    } else {

      const buttons = collectionsData.map((value) => {
        return new ButtonBuilder().setCustomId(value.name).setLabel(value.name).setStyle(ButtonStyle.Primary);
      })

      let rows = [];
      for (let i = 0; i < buttons.length; i += 3) {
        rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(buttons.slice(i, i + 3)));
      }

      message.reply({ content: 'Select collection', components: [...rows] });

    }
  })

  discordClient.on('interactionCreate', async (interaction) => {

    if (!interaction.isButton()) {
      return;
    }

    const { customId } = interaction;

    let collection = collectionsDataHistory.find((value) => value.name === customId);

    // if timestamp is older than 5 seconds, ignore
    if (collection && collection.timestamp && Date.now() - collection.timestamp > 5000) {
      collection = await getSpecificCollection(collection.contractAddress);
    }

    if (collection) {
      const name = `[${collection.name}](${`https://www.stargaze.zone/m/${collection.contractUri}`}):\n`
      const floor = `Floor: ${removeDecimals(collection.floorPrice)} $stars`
      const offer = `${collection.highestOffer.price ? `\nHighest offer: ${removeDecimals(collection.highestOffer.price ?? 0)} $stars` : ''}`
      const website = `${collection.website ? `\nWebsite: ${collection.website}` : ''}`

      interaction.message.delete();
      await interaction.reply(`${name}${floor}${offer}${website}`);
    } else {
      interaction.message.delete();
      await interaction.reply('Collection not found');
    }
  })


  discordClient.login(DISCORD_TOKEN);
}

main();