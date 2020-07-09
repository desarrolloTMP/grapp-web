import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from './app.component';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { AppRoutingModule } from './app.routes';
import { SharedModule } from './shared.module';
import { SecurityService } from './submodules/auth/services/security.service';
import { ImageService } from './services/image.service';
import { ROLE_COMPARATOR } from 'ngx-3a';
import { Users } from 'grapp-common-se';
import { of } from 'rxjs';
import { ExcelService } from './services/excel.service';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule.withServerTransition({ appId: 'serverApp' }),
    BrowserAnimationsModule,
    HttpClientModule,
    AppRoutingModule,
    SharedModule,
    ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production }),
  ],
  providers: [
    {
      provide: ROLE_COMPARATOR,
      useValue: (user: Users.User, role: Users.UserType) => {
        return of(user.userType === role);
      },
    },
    SecurityService,
    ImageService,
    ExcelService,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
