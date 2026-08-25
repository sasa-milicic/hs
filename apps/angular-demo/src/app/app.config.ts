import {
  Location,
  LocationStrategy,
  PathLocationStrategy,
} from '@angular/common';
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    Location,
    { provide: LocationStrategy, useClass: PathLocationStrategy },
  ],
};
