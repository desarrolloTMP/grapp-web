// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  serverURL: 'http://localhost:3000',
  //serverURL: 'http://192.168.1.231:3000',
  appURL: 'http://localhost:4200',
  sesso: {
    appId: '5cdadea643779f38588ffdc2',
    apiKey: 'U2FsdGVkX1/AJwijWF8J3LMdBHHorp5SWkfpeOiOOy4=',
    userId: 'developer+grapp@tresastronautas.com',
    //apiUrl: 'http://68.183.115.58:3200',
    apiUrl: 'http://192.168.1.234:3200',
    aesKey: '$4lud3l3ctr0n1C4Gr4pP',
  },
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
