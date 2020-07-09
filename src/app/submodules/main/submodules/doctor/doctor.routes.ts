import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { DoctorComponent } from './doctor.component';

const routes: Routes = [
  //   { path: '', redirectTo: '0', pathMatch: 'full' },
  {
    path: '',
    component: DoctorComponent,
    // children: [
    //   { path: '', redirectTo: 'properties', pathMatch: 'full' },
    //   { path: 'properties', loadChildren: '../submodules/properties/properties.module#PropertiesModule' },
    //   { path: 'frontdesk', loadChildren: '../submodules/frontdesk/frontdesk.module#FrontdeskModule' },
    //   { path: 'access', loadChildren: '../submodules/access/access.module#AccessModule' },
    //   { path: 'bookings', loadChildren: '../submodules/bookings/bookings.module#BookingsModule' },
    //   { path: '**', redirectTo: 'properties' },
    // ],
  },
];

@NgModule({
  imports: [CommonModule, RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DoctorRoutingModule {}
