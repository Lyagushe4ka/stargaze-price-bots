import { Client, GatewayIntentBits, ButtonBuilder, ButtonStyle } from "discord.js";
import { DISCORD_TOKEN } from "../secrets";
import { ActionRowBuilder } from "@discordjs/builders";
import { Collection, getCollections, getSpecificCollection, removeDecimals } from "./Helpers";

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
      const firstOffer = `${collectionsData[0].highestOffer ? `\nHighest offer: ${removeDecimals(collectionsData[0].highestOffer.price ?? 0)} $stars` : ''}`
      const firstWebsite = `${collectionsData[0].website ? `\nWebsite: ${collectionsData[0].website}` : ''}`
      const firstVolume24Hours = `${collectionsData[0].stats.volume24Hour ? `\nVolume 24h: ${removeDecimals(collectionsData[0].stats.volume24Hour ?? 0)} $stars` : ''}`
      const firstVolume7Days = `${collectionsData[0].stats.volume7Day ? `\nVolume 7d: ${removeDecimals(collectionsData[0].stats.volume7Day ?? 0)} $stars` : ''}`
      const firstCollectionString = `${firstName}${firstFloor}${firstOffer}\n${firstVolume24Hours}${firstVolume7Days}${firstWebsite}`

      let secondCollectionString = ''
      if (collectionsData.length === 2) {
        const secondName = `\n\n[${collectionsData[1].name}](${`https://www.stargaze.zone/m/${collectionsData[1].contractUri}`}):\n`
        const secondFloor = `Floor: ${removeDecimals(collectionsData[1].floorPrice)} $stars`
        const secondOffer = `${collectionsData[1].highestOffer ? `\nHighest offer: ${removeDecimals(collectionsData[1].highestOffer.price ?? 0)} $stars` : ''}`
        const secondWebsite = `${collectionsData[1].website ? `\nWebsite: ${collectionsData[1].website}` : ''}`
        const secondVolume24Hours = `${collectionsData[1].stats.volume24Hour ? `\nVolume 24h: ${removeDecimals(collectionsData[1].stats.volume24Hour ?? 0)} $stars` : ''}`
        const secondVolume7Days = `${collectionsData[1].stats.volume7Day ? `\nVolume 7d: ${removeDecimals(collectionsData[1].stats.volume7Day ?? 0)} $stars` : ''}`
        secondCollectionString = `${secondName}${secondFloor}${secondOffer}\n${secondVolume24Hours}${secondVolume7Days}${secondWebsite}`
      }

      message.reply({content: `${firstCollectionString}${secondCollectionString}`, flags: 'SuppressEmbeds',});

    } else {

      const buttons = collectionsData.map((value) => {
        return new ButtonBuilder().setCustomId(value.contractAddress).setLabel(value.name).setStyle(ButtonStyle.Primary);
      })

      let rows = [];
      for (let i = 0; i < buttons.length; i += 3) {
        rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(buttons.slice(i, i + 3)));
      }
      console.log(rows);
      message.reply({ content: 'Select collection', components: [...rows] });

    }
  })

  discordClient.on('interactionCreate', async (interaction) => {

    if (!interaction.isButton()) {
      return;
    }

    const { customId } = interaction;

    let collection = collectionsDataHistory.find((value) => value.contractAddress === customId);

    // if timestamp is older than 5 seconds, ignore
    if (collection && collection.timestamp && Date.now() - collection.timestamp > 5000) {
      collection = await getSpecificCollection(collection.contractAddress);
    }

    if (collection) {
      const name = `[${collection.name}](${`https://www.stargaze.zone/m/${collection.contractUri}`}):\n`
      const floor = `Floor: ${removeDecimals(collection.floorPrice)} $stars`
      const offer = `${collection.highestOffer ? `\nHighest offer: ${removeDecimals(collection.highestOffer.price ?? 0)} $stars` : ''}`
      const website = `${collection.website ? `\nWebsite: ${collection.website}` : ''}`
      const volume24Hours = `${collection.stats.volume24Hour ? `\nVolume 24h: ${removeDecimals(collection.stats.volume24Hour ?? 0)} $stars` : ''}`
      const volume7Days = `${collection.stats.volume7Day ? `\nVolume 7d: ${removeDecimals(collection.stats.volume7Day ?? 0)} $stars` : ''}`

      interaction.message.delete();
      await interaction.reply({content: `${name}${floor}${offer}\n${volume24Hours}${volume7Days}${website}`, flags: 'SuppressEmbeds',});
    } else {
      interaction.message.delete();
      await interaction.reply('Collection not found');
    }
  })


  discordClient.login(DISCORD_TOKEN);
}

main();