import { useReducer, useCallback } from 'react';
import { HistoryState, ActionType } from '../types';

const initialState = <T>(initialPresent: T): HistoryState<T> => ({
  past: [],
  present: initialPresent,
  future: [],
});

const reducer = <T>(state: HistoryState<T>, action: { type: ActionType; payload?: T }): HistoryState<T> => {
  const { past, present, future } = state;

  switch (action.type) {
    case 'UNDO':
      if (past.length === 0) return state;
      const previous = past[past.length - 1];
      const newPast = past.slice(0, past.length - 1);
      return {
        past: newPast,
        present: previous,
        future: [present, ...future],
      };
    case 'REDO':
      if (future.length === 0) return state;
      const next = future[0];
      const newFuture = future.slice(1);
      return {
        past: [...past, present],
        present: next,
        future: newFuture,
      };
    case 'SET':
      if (action.payload === present) return state;
      return {
        past: [...past, present],
        present: action.payload as T,
        future: [], // Clear future when new action is taken
      };
    case 'RESET':
      return initialState(action.payload as T);
    default:
      return state;
  }
};

export const useHistory = <T>(initialPresent: T) => {
  const [state, dispatch] = useReducer(reducer, initialState(initialPresent)) as [
    HistoryState<T>,
    React.Dispatch<{ type: ActionType; payload?: T }>
  ];

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);
  const set = useCallback((newPresent: T) => dispatch({ type: 'SET', payload: newPresent }), []);
  const reset = useCallback((newPresent: T) => dispatch({ type: 'RESET', payload: newPresent }), []);

  return { state: state.present, set, undo, redo, canUndo, canRedo, reset };
};