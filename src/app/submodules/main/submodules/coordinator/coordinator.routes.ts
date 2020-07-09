import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { CoordonatorComponent } from './coordinator.component';
import { CoordinatorUsersComponent } from './components/users/users.component';
import { CoordinatorPatientsComponent } from './components/patients/patients.component';
import { CupsComponent } from './components/cups/cups.component';
import { AnalyticsComponent } from './components/analytics/analytics.component';
import { CIE10Component } from './components/cie10/cie10.component';
import { OrdersComponent } from './components/orders/orders.component';
import { EhrComponent } from './components/ehr/ehr.component';

const routes: Routes = [
  {
    path: '',
    component: CoordonatorComponent,
    children: [
      { path: 'users', component: CoordinatorUsersComponent },
      { path: 'patients', component: CoordinatorPatientsComponent },
      { path: 'cups', component: CupsComponent },
      { path: 'cie10', component: CIE10Component },
      { path: 'analytics', component: AnalyticsComponent },
      { path: 'orders', component: OrdersComponent },
      { path: 'ehr', component: EhrComponent },
      { path: '**', redirectTo: 'users' },
    ],
  },
];

@NgModule({
  imports: [CommonModule, RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CoordinatorRoutingModule {}
