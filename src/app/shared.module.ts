import { NgModule } from '@angular/core';
import {
  AuthenticationModule,
  DashboardModule,
  FormsModule,
  UtilitiesModule,
  MicroServicesModule,
  AuthenticationService,
  TokenService,
} from 'ngx-3a';
import { MongoModule } from 'ngx-3a-mongo';
import { MatInputModule, MatDatepickerModule, MatNativeDateModule } from '@angular/material';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { SESSOService } from './submodules/auth/services/sesso.service';
import { environment } from 'src/environments/environment';
import { SESSOTokenService } from './submodules/auth/services/token.service';
import { SwitchComponent } from './components/fields/switch/switch.field.component';
import { TextComponent } from './components/fields/text/text.field.component';
import { TextArea2Component } from './components/fields/textarea/textarea.field.component';
import { FormlyModule } from '@ngx-formly/core';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { PapaParseModule } from 'ngx-papaparse';
import { Relation2Component } from './components/fields/relation/relation.field.component';
import { Select2Component } from './components/fields/select/select.field.component';
import { File2Component } from './components/fields/file/file.field.component';
// @dynamic
@NgModule({
  declarations: [SwitchComponent, TextComponent, TextArea2Component, Relation2Component, Select2Component, File2Component],
  imports: [
    MatIconModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    CommonModule,
    DashboardModule,
    FormsModule,
    UtilitiesModule,
    ScrollingModule,
    InfiniteScrollModule,
    MicroServicesModule.forRoot({
      dispatcherURL: environment.serverURL,
    }),
    MongoModule.forRoot({
      database: {
        databaseURL: environment.serverURL,
      },
    }),
    FormlyModule.forRoot({
      types: [
        {
          name: 'switch',
          component: SwitchComponent,
        },
        {
          name: 'input',
          component: TextComponent,
          defaultOptions: {
            templateOptions: {
              large: true,
            },
          },
        },
        {
          name: 'textarea',
          component: TextArea2Component,
          defaultOptions: {
            templateOptions: {
              large: true,
            },
          },
        },
        {
          name: 'relation',
          component: Relation2Component,
          defaultOptions: {},
        },
        {
          name: 'select',
          component: Select2Component,
          defaultOptions: {
            templateOptions: {
              large: true,
            },
          },
        },
        {
          name: 'file',
          component: File2Component,
          defaultOptions: {
            templateOptions: {
              large: true,
            },
          },
        },
      ],
    }),
    PapaParseModule,
  ],
  exports: [
    MatIconModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    CommonModule,
    ScrollingModule,
    InfiniteScrollModule,
    AuthenticationModule,
    DashboardModule,
    FormsModule,
    UtilitiesModule,
    MicroServicesModule,
    FormlyModule,
    PapaParseModule,
  ],
  providers: [
    {
      provide: AuthenticationService,
      useClass: SESSOService,
    },
    {
      provide: TokenService,
      useClass: SESSOTokenService,
    },
  ],
})
export class SharedModule {}
