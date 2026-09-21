import { describe, expect, it, vi } from "vitest";

import type CosmosDBService from "@/services/CosmosDBService";
import {
  parseProvisionArgs,
  provisionCosmosContainer,
} from "@/scripts/provision-cosmos";

describe("Cosmos DB provisioning", () => {
  it("parses help without requiring configuration", () => {
    expect(parseProvisionArgs(["--help"])).toEqual({ kind: "help" });
    expect(parseProvisionArgs(["-h"])).toEqual({ kind: "help" });
  });

  it("parses required flags and optional throughput", () => {
    expect(
      parseProvisionArgs([
        "--container",
        " records ",
        "--partition-key",
        "/tenantId",
        "--throughput",
        "400",
      ]),
    ).toEqual({
      kind: "run",
      value: {
        containerId: "records",
        partitionKeyPath: "/tenantId",
        throughput: 400,
      },
    });
  });

  it.each([
    [[], "--container"],
    [["--container", "records"], "--partition-key"],
    [
      ["--container", "records", "--partition-key", "tenantId"],
      "begin with /",
    ],
    [
      ["--container", "records", "--partition-key", "/tenant id"],
      "no whitespace",
    ],
    [
      [
        "--container",
        "records",
        "--partition-key",
        "/tenantId",
        "--throughput",
        "0",
      ],
      "positive integer",
    ],
    [["--unknown", "value"], "Unknown option"],
  ])("rejects invalid arguments %#", (argv, message) => {
    expect(() => parseProvisionArgs(argv)).toThrowError(message);
  });

  it("creates a container only through the explicit provisioning function", async () => {
    const createIfNotExists = vi.fn().mockResolvedValue({ statusCode: 201 });
    const service = {
      getDatabase: () => ({ containers: { createIfNotExists } }),
    } as unknown as CosmosDBService;

    await expect(
      provisionCosmosContainer(
        {
          containerId: "records",
          partitionKeyPath: "/tenantId",
          throughput: 400,
        },
        service,
      ),
    ).resolves.toEqual({ containerId: "records", created: true });
    expect(createIfNotExists).toHaveBeenCalledWith({
      id: "records",
      partitionKey: "/tenantId",
      throughput: 400,
    });
  });

  it("reports an existing container from a non-create status", async () => {
    const createIfNotExists = vi.fn().mockResolvedValue({ statusCode: 200 });
    const service = {
      getDatabase: () => ({ containers: { createIfNotExists } }),
    } as unknown as CosmosDBService;

    await expect(
      provisionCosmosContainer(
        { containerId: "records", partitionKeyPath: "/tenantId" },
        service,
      ),
    ).resolves.toEqual({ containerId: "records", created: false });
  });
});
