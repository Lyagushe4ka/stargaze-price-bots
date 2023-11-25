import axios from "axios";


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
  stats: {
    volume24Hour: string;
    volume7Day: string;
  }
  timestamp: number;
}

export const querySearchCollection = `
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
        stats {
          volume24Hour
          volume7Day
        }
      }
    }
  }
`;

export const querySpecificCollection = `
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
      stats {
        volume24Hour
        volume7Day
      }
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
