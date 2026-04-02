import React, { createContext, useContext, useReducer, ReactNode } from 'react';

export enum ActionType {
  OPEN_DRAWER = 'OPEN_DRAWER',
  ACTIVE_ITEM = 'ACTIVE_ITEM',
  ACTIVE_COMPONENT = 'ACTIVE_COMPONENT',
}

interface MenuState {
  openItem: string[];
  defaultId: string;
  openComponent: string;
  drawerOpen: boolean;
  componentDrawerOpen: boolean;
}

const initialState: MenuState = {
  openItem: ['dashboard'],
  defaultId: 'dashboard',
  openComponent: 'buttons',
  drawerOpen: true,
  componentDrawerOpen: true,
};

const MenuContext = createContext<{
  menu: MenuState;
  setMenu: React.Dispatch<any>;
}>({ menu: initialState, setMenu: () => {} });

function menuReducer(state: MenuState, action: any): MenuState {
  switch (action.type) {
    case ActionType.OPEN_DRAWER:
      return { ...state, drawerOpen: action.payload };
    case ActionType.ACTIVE_ITEM:
      return { ...state, openItem: action.payload };
    case ActionType.ACTIVE_COMPONENT:
      return { ...state, openComponent: action.payload };
    default:
      return state;
  }
}

export const MenuProvider = ({ children }: { children: ReactNode }) => {
  const [menu, setMenu] = useReducer(menuReducer, initialState);
  return <MenuContext.Provider value={{ menu, setMenu }}>{children}</MenuContext.Provider>;
};

export default function useMenu() {
  return useContext(MenuContext);
}
