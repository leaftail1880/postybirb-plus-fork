import * as lowdb from 'lowdb';
import 'node';

declare global {
  var CHILD_PROCESS_IDS: number[];
  var AUTH_ID: string;
  var AUTH_SERVER_URL: string;
  var BASE_DIRECTORY: string;
  var DEBUG_MODE: boolean;
  var SERVER_ONLY_MODE: boolean;
  var settingsDB: lowdb.LowdbSync<any>;
  var tray: any;
  var showApp: () => void;
}
