import 'server-only';

import {
  Container,
  CosmosClient,
  DeleteOperationInput,
  ItemDefinition,
} from '@azure/cosmos';

export default class CosmosDBService {
  async getCosmosClient() {
    const client = new CosmosClient({
      endpoint: process.env.COSMOS_DB_ENDPOINT ?? '',
      key: process.env.COSMOS_DB_KEY,
    });

    return client;
  }

  async getContainer(containerId: CONTAINER_ID) {
    const client = await this.getCosmosClient();

    const r = await client
      .database(process.env.COSMOS_DB_NAME ?? 'daruda_dev')
      .containers.createIfNotExists({
        id: containerId,
        partitionKey: '/partition_key',
      });
    return r.container;
  }
}

export type CONTAINER_ID =
  | 'permissions'
  | 'glossary_languages'
  | 'glossarys'
  | 'files'
  | 'translations'
  | 'refdata';

type DeleteAllProps = {
  container: Container;
  items: ItemDefinition[];
  chunkSize?: number;
};

export async function deleteAll({
  container,
  items,
  chunkSize = 100,
}: DeleteAllProps) {
  // console.log(items);
  const operations: DeleteOperationInput[] = items.map((item) => ({
    operationType: 'Delete',
    id: item.id ?? '',
    partitionKey: item.partitionKey ?? item.partition_key,
  }));

  // Bulk 요청을 나누어 처리
  for (let i = 0; i < operations.length; i += chunkSize) {
    const chunk = operations.slice(i, i + chunkSize);
    try {
      await container.items.bulk(chunk);
    } catch (error) {
      console.error(error);
    }
  }
  return {
    success: true,
  };
}
