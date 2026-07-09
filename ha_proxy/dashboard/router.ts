import express from "express";
import { getWrapper } from "../../ha_wrap/wrapperRegistry";
import { loadWrapperMemory } from "../../ha_wrap/shared/memoryLoader";

import { scoreMemory } from "../../ha_learn/memoryScore";
import { decayMemory } from "../../ha_learn/memoryDecay";
import { weightMemory } from "../../ha_learn/memoryWeight";
import { pruneMemory } from "../../ha_learn/memoryPrune";
import { resolveConflicts } from "../../ha_learn/memoryResolve";

import { applyCCR } from "../../ha_core/transform/ccr";

export const dashboardRouter = express.Router();

// GET /dashboard/:wrapper/anchors

// GET /dashboard/:wrapper/memory

// GET /dashboard/:wrapper/ccr?prompt=hello

// GET /dashboard/:wrapper/provider?prompt=hello

// GET /dashboard/:wrapper/config
