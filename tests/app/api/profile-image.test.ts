import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isEnabled: vi.fn(),
  getSession: vi.fn(),
  graphApi: vi.fn(),
  graphGet: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/services/AuthService", () => ({
  default: class MockAuthService {
    isEnabled() {
      return mocks.isEnabled();
    }

    getSession() {
      return mocks.getSession();
    }
  },
}));
vi.mock("@/services/MSGraphService", () => ({
  default: class MockGraphService {
    getMSGraphClient() {
      return { api: mocks.graphApi };
    }
  },
}));

import { GET } from "@/app/api/profile-image/route";

describe("GET /api/profile-image", () => {
  const consoleError = vi
    .spyOn(console, "error")
    .mockImplementation(() => undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isEnabled.mockReturnValue(true);
    mocks.getSession.mockResolvedValue({
      user: { oid: "oid-1", roles: [] },
    });
    mocks.graphApi.mockReturnValue({ get: mocks.graphGet });
    mocks.graphGet.mockResolvedValue(new Blob(["image"]));
  });

  afterEach(() => {
    consoleError.mockClear();
  });

  it("returns 404 without initializing auth when disabled", async () => {
    mocks.isEnabled.mockReturnValue(false);

    const response = await GET();

    expect(response.status).toBe(404);
    expect(mocks.getSession).not.toHaveBeenCalled();
    expect(mocks.graphApi).not.toHaveBeenCalled();
  });

  it("returns 404 for an anonymous session", async () => {
    mocks.getSession.mockResolvedValue(null);

    expect((await GET()).status).toBe(404);
    expect(mocks.graphApi).not.toHaveBeenCalled();
  });

  it("uses only the current session OID", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(mocks.graphApi).toHaveBeenCalledWith(
      "/users/oid-1/photos/48x48/$value",
    );
  });

  it("maps a missing Graph photo to 404", async () => {
    mocks.graphGet.mockRejectedValue({ statusCode: 404 });

    expect((await GET()).status).toBe(404);
  });

  it("maps other Graph errors to a generic 502", async () => {
    mocks.graphGet.mockRejectedValue(
      new Error("fake-token-that-must-not-leak"),
    );

    const response = await GET();

    expect(response.status).toBe(502);
    expect(await response.text()).toBe("");
    expect(consoleError).toHaveBeenCalledWith(
      "Profile image request failed",
      { route: "/api/profile-image" },
    );
  });
});
