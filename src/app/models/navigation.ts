import { Observable } from 'rxjs';

/**
 * Options for Modals to be opened
 */
export enum Modals {
  NONE = -1,
  REQUEST,
  PATIENT,
  AUTHORIZATION,
  USER,
  CSV,
  ANALYST_REQUEST,
  ORDER,
  EXECUTORS,
  CALL,
  CUPS,
  DELETE_ORDER
}
/**
 * Event sent to propagate over the aplication to the requiered modals to be opened
 */
export interface ModalEvent {
  type: Modals;
  payload?: { [_: string]: any };
  confirmation?: Action;
  cancelation?: Action;
}
/**
 * An interface to handle actions inside a modal, can be used as closing action if boolean returns true
 */
export interface Action {
  text: string;
  callback?: (payload?: { [_: string]: any }) => boolean | Observable<boolean>;
}
/**
 * Interface to wrapp an event for alert modals across the entire app
 */
export interface AlertEvent {
  title: string;
  content?: string;
  confirmation?: Action;
  cancelation?: Action;
}
/**
 * Interface to express a Menu Item
 */
export interface Menu {
  title: string;
  route: string;
}
