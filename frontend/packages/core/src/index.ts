import {
  callService,
  createConnection,
  createLongLivedTokenAuth,
  type Connection,
} from "home-assistant-js-websocket";

export { subscribeEntities, type Connection, type HassEntities } from "home-assistant-js-websocket";

export type Room = { id: string; name: string; lights: string[] };

export const connectWithToken = (url: string, token: string) =>
  createConnection({ auth: createLongLivedTokenAuth(url, token) });

export const fetchRooms = (conn: Connection) =>
  conn.sendMessagePromise<Room[]>({ type: "lightwick/rooms" });

export const setLights = (conn: Connection, entity_id: string[], on: boolean) =>
  callService(conn, "light", on ? "turn_on" : "turn_off", undefined, { entity_id });
