import "server-only";

import { parseServerEnv, type ServerEnv } from "./env.schema";

export const serverEnv: ServerEnv = parseServerEnv(process.env);
