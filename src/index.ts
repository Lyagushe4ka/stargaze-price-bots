import axios from "axios";
import { Telegraf, Markup } from "telegraf";
import { message } from "telegraf/filters";
import { BOT_TOKEN } from "../secrets";


const bot = new Telegraf(BOT_TOKEN);

export type Collection = {
  floorPrice: string;
  name: string;
  website: string;
  highestOffer: {
    floorPriceDifferencePercent: string;
    price: string;
  }
  contractUri: string;
  contractAddress: string;
  timestamp: number;
}

const querySearchCollection = `
  query SearchCollection($searchQuery: String) {
    collections(searchQuery: $searchQuery) {
      collections {
        floorPrice
        name
        website
        highestOffer {
          floorPriceDifferencePercent
          price
        }
        contractUri
        contractAddress
      }
    }
  }
`;

const querySpecificCollection = `
  query SearchSpecificCollection($address: String!) {
    collection(address: $address) {
      floorPrice
      name
      website
      highestOffer {
        floorPriceDifferencePercent
        price
      }
      contractUri
      contractAddress
    }
  }
`

export async function getCollections(search: string): Promise<Collection[]> {
  let request;
  try {
    request = await axios.post(
      'https://graphql.mainnet.stargaze-apis.com/graphql',
      {
        query: querySearchCollection,
        variables: {
          searchQuery: search,
        },
      },
    )
  } catch (e: any) {
    return [];
  }
  return request.data.data.collections.collections
}

export async function getSpecificCollection(address: string): Promise<Collection | undefined> {
  let request;
  try {
    request = await axios.post(
      'https://graphql.mainnet.stargaze-apis.com/graphql',
      {
        query: querySpecificCollection,
        variables: {
          address: address,
        },
      },
    )
  } catch (e: any) {
    return undefined;
  }
  return request.data.data.collection
}

export function removeDecimals(value: string): string {
  return (+value / 1000000).toFixed(2)
}

async function main() {

  let collectionsDataHistory: Collection[] = []
  
  bot.on(message('text'), async (ctx) => {
    if (!ctx.message.text.startsWith('!')) {
      return;
    }

    const search = ctx.message.text.replace('!', '').trim().toLowerCase().replace(' ', '_')

    let collectionsData = await getCollections(search)
    collectionsData.map((value) => {
      value.timestamp = Date.now()
    })

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

    if (!collectionsData || collectionsData.length === 0) {
      return ctx.reply(`Collection not found`,
        { reply_to_message_id: ctx.message.message_id, disable_notification: true }
      )
    } else if (collectionsData.length === 1 || collectionsData.length === 2) {
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

      ctx.reply(`${firstCollectionString}${secondCollectionString}`,
        { reply_to_message_id: ctx.message.message_id, disable_notification: true, parse_mode: 'Markdown', disable_web_page_preview: true }
      )
    } else {
      const buttons = collectionsData.map((value) => {
        return Markup.button.callback(value.name, value.name)
      })

      const keyboard = Markup.inlineKeyboard(buttons, { columns: 1 })
      ctx.reply(`Select collection`, keyboard);
    }
  })

  bot.action(/.+/, async (ctx) => {
    let collection = collectionsDataHistory.find((value) => value.name === ctx.match[0])

    if (collection && collection.timestamp && Date.now() - collection.timestamp > 5000) {
      collection = await getSpecificCollection(collection.contractAddress);
    }

    if (collection) {
      const name = `[${collection.name}](${`https://www.stargaze.zone/m/${collection.contractUri}`}):\n`
      const floor = `Floor: ${removeDecimals(collection.floorPrice)} $stars`
      const offer = `${collection.highestOffer.price ? `\nHighest offer: ${removeDecimals(collection.highestOffer.price ?? 0)} $stars` : ''}`
      const website = `${collection.website ? `\nWebsite: ${collection.website}` : ''}`

      ctx.deleteMessage()
      ctx.reply(`${name}${floor}${offer}${website}`,
      { parse_mode: 'Markdown', disable_web_page_preview: true },
      )
    } else {
      ctx.deleteMessage()
      ctx.reply(`Error occured`)
    }
  })

  bot.launch()
}

main()

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
