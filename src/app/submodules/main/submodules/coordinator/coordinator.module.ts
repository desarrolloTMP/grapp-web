import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared.module';
import { CoordonatorComponent } from './coordinator.component';
import { CoordinatorRoutingModule } from './coordinator.routes';
import { CoordinatorUsersComponent } from './components/users/users.component';
import { CoordinatorPatientsComponent } from './components/patients/patients.component';
import { CSVService } from './services/csv.service';
import { CupsComponent } from './components/cups/cups.component';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { AnalyticsComponent } from './components/analytics/analytics.component';
import { CIE10Component } from './components/cie10/cie10.component';
import { OrdersComponent } from './components/orders/orders.component';
import { EhrComponent } from './components/ehr/ehr.component';

@NgModule({
  declarations: [
    CoordonatorComponent,
    CoordinatorUsersComponent,
    CoordinatorPatientsComponent,
    CupsComponent,
    AnalyticsComponent,
    CIE10Component,
    OrdersComponent,
    EhrComponent
  ],
  imports: [CommonModule, CoordinatorRoutingModule, FormsModule, SharedModule, NgxChartsModule],
  exports: [],
  providers: [CSVService],
})
export class CoordinatorModule { }
