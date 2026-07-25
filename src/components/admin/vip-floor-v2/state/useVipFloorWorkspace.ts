"use client";

import { useEffect, useReducer, useState } from "react";

import type { ScenarioDefinition } from "../contract/uiTypes";
import { FixtureCommandGateway } from "../data/FixtureCommandGateway";
import type { FixtureCommandDraft } from "../contract/uiTypes";
import { createInitialState, workspaceReducer } from "./reducer";

export function useVipFloorWorkspace(initialScenario: ScenarioDefinition) {
  const [state, dispatch] = useReducer(workspaceReducer, initialScenario, createInitialState);
  const [gateway] = useState(() => new FixtureCommandGateway());

  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) return;
    dispatch({ type: "view", view: "floor" });
    if (window.matchMedia("(max-width: 1279px)").matches) {
      dispatch({ type: "queueCollapsed", collapsed: true });
      dispatch({ type: "inspectorCollapsed", collapsed: true });
    }
  }, []); // Mobile stays list-first; larger workspaces switch once to the spatial floor view.

  async function runCommand(draft: FixtureCommandDraft) {
    dispatch({ type: "pending", pending: true });
    const outcome = await gateway.execute(state.board, draft, state.command.resultMode);
    dispatch({ type: "commandOutcome", outcome });
  }

  return { state, dispatch, runCommand };
}
