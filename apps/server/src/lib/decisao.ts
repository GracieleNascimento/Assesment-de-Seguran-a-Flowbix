/** Conversão entre a decisão do @flowbix/core ("go" | "condicional" | "no-go") e o enum do banco. */
import type { Decisao as DecisaoCore } from "@flowbix/core";
import type { Decisao as DecisaoDb } from "../generated/prisma/client.js";

const PARA_DB: Record<DecisaoCore, DecisaoDb> = { go: "GO", condicional: "CONDICIONAL", "no-go": "NO_GO" };
const PARA_API: Record<DecisaoDb, DecisaoCore> = { GO: "go", CONDICIONAL: "condicional", NO_GO: "no-go" };

export const DECISOES = ["go", "condicional", "no-go"] as const;

export const decisaoParaDb = (d: DecisaoCore): DecisaoDb => PARA_DB[d];
export const decisaoParaApi = (d: DecisaoDb): DecisaoCore => PARA_API[d];
