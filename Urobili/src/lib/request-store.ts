import { AsyncLocalStorage } from "async_hooks";

export type RequestStoreContext = {
  token?: string;
  activeProfile?: string;
  ownerId?: string;
  userId?: string;
  role?: string;
};

export const requestStore = new AsyncLocalStorage<RequestStoreContext>();
