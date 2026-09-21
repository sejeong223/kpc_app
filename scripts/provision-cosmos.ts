import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import CosmosDBService from "@/services/CosmosDBService";

export interface ProvisionCosmosArgs {
  containerId: string;
  partitionKeyPath: `/${string}`;
  throughput?: number;
}

export class ProvisionArgumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProvisionArgumentError";
  }
}

const usage = `Usage: npm run azure:cosmos:provision -- --container <id> --partition-key </path> [--throughput <positive-integer>]

Options:
  --container <id>          Cosmos DB container id
  --partition-key </path>   Partition key path beginning with /
  --throughput <number>     Optional positive integer throughput
  --help, -h                Show this help`;

export function parseProvisionArgs(
  argv: readonly string[],
): { kind: "help" } | { kind: "run"; value: ProvisionCosmosArgs } {
  if (argv.includes("--help") || argv.includes("-h")) {
    return { kind: "help" };
  }

  const values = new Map<string, string>();
  const supportedFlags = new Set([
    "--container",
    "--partition-key",
    "--throughput",
  ]);

  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];

    if (!supportedFlags.has(flag)) {
      throw new ProvisionArgumentError(`Unknown option: ${flag}`);
    }

    if (value === undefined || value.startsWith("--")) {
      throw new ProvisionArgumentError(`Missing value for ${flag}`);
    }

    if (values.has(flag)) {
      throw new ProvisionArgumentError(`Duplicate option: ${flag}`);
    }

    values.set(flag, value.trim());
  }

  const containerId = values.get("--container") ?? "";
  const partitionKeyPath = values.get("--partition-key") ?? "";

  if (containerId.length === 0) {
    throw new ProvisionArgumentError("--container must be a non-empty value");
  }

  if (!partitionKeyPath.startsWith("/") || /\s/.test(partitionKeyPath)) {
    throw new ProvisionArgumentError(
      "--partition-key must begin with / and contain no whitespace",
    );
  }

  const rawThroughput = values.get("--throughput");
  let throughput: number | undefined;

  if (rawThroughput !== undefined) {
    throughput = Number(rawThroughput);

    if (!Number.isInteger(throughput) || throughput <= 0) {
      throw new ProvisionArgumentError(
        "--throughput must be a positive integer",
      );
    }
  }

  return {
    kind: "run",
    value: {
      containerId,
      partitionKeyPath: partitionKeyPath as `/${string}`,
      ...(throughput === undefined ? {} : { throughput }),
    },
  };
}

export async function provisionCosmosContainer(
  args: ProvisionCosmosArgs,
  service: CosmosDBService = new CosmosDBService(),
): Promise<{ containerId: string; created: boolean }> {
  const response = await service.getDatabase().containers.createIfNotExists({
    id: args.containerId,
    partitionKey: args.partitionKeyPath,
    ...(args.throughput === undefined ? {} : { throughput: args.throughput }),
  });

  return {
    containerId: args.containerId,
    created: response.statusCode === 201,
  };
}

export async function main(argv: readonly string[] = process.argv.slice(2)) {
  try {
    const parsed = parseProvisionArgs(argv);

    if (parsed.kind === "help") {
      console.log(usage);
      return;
    }

    const result = await provisionCosmosContainer(parsed.value);
    console.log(
      result.created
        ? `Created Cosmos DB container: ${result.containerId}`
        : `Cosmos DB container already exists: ${result.containerId}`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Cosmos DB provisioning failed: ${message}`);
    process.exitCode = 1;
  }
}

const entryPoint = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : undefined;

if (entryPoint === import.meta.url) {
  void main();
}
