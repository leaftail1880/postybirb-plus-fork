import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import * as serviceWorker from './serviceWorker';
import './styles/scrollbar.css';
import './styles/submission.css';
import { Authorizer } from './websites/interfaces/authorizer.interface';

declare global {
  interface Window {
    electron: {
      clipboard: {
        availableFormats: () => string[];
        read: () => File;
      };
      session: {
        getCookies(accountId: string): Promise<any[]>;
        clearSessionData(id: string): Promise<void>;
      };
      shell: {
        openInBrowser(url: string): Promise<void>;
      };
      kill: () => void;
      auth: {
        Tumblr: Authorizer;
        DeviantArt: Authorizer;
        VKontakte: Authorizer;
      };
    };
    AUTH_ID: string;
    AUTH_SERVER_URL: string;
    PORT: number;
    IS_DARK_THEME: boolean;
    appVersion: string;
  }
}

ReactDOM.render(<App />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls. Learn
// more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
