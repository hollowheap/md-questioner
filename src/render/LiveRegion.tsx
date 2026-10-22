import React, { createContext, useContext } from "react";

export type Announce = (message: string) => void;

export const LiveRegionContext = createContext<Announce>(() => undefined);

export function useAnnounce(): Announce {
  return useContext(LiveRegionContext);
}
