import { createContext } from 'react';

export type ReturnTargets = Map<string, string>;

export const ReturnTargetsContext = createContext<ReturnTargets | null>(null);
