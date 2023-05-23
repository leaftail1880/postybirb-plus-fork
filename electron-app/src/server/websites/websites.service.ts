import { Injectable } from '@nestjs/common';
import { WebsiteProvider } from './website-provider.service';
import { UsernameShortcut } from 'postybirb-commons';

@Injectable()
export class WebsitesService {
  constructor(private readonly providers: WebsiteProvider) {}

  getUsernameShortcuts() {
    const shortcuts: Record<string, UsernameShortcut[]> = {};
    this.providers.getAllWebsiteModules().forEach((w) => {
      if (w.usernameShortcuts.length) {
        shortcuts[w.constructor.name] = w.usernameShortcuts;
      }
    });
    return shortcuts;
  }
}
