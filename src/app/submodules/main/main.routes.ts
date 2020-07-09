import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MainComponent } from './main.component';
import { Users } from 'grapp-common-se';
import { RoleGuard } from 'ngx-3a';

const routes: Routes = [
  {
    path: '',
    component: MainComponent,
    children: [
      { path: '', redirectTo: 'assistant', pathMatch: 'full' },
      {
        path: 'assistant',
        loadChildren: './submodules/assistant/assistant.module#AssistantModule',
        data: { rolesAllowed: Users.UserType.ASSISTANT },
        canActivate: [RoleGuard],
      },
      {
        path: 'doctor',
        loadChildren: './submodules/doctor/doctor.module#DoctorModule',
        data: { rolesAllowed: Users.UserType.DOCTOR },
        canActivate: [RoleGuard],
      },
      {
        path: 'coordinator',
        loadChildren: './submodules/coordinator/coordinator.module#CoordinatorModule',
        data: { rolesAllowed: Users.UserType.COORDINATOR },
        canActivate: [RoleGuard],
      },
      {
        path: 'analyst',
        loadChildren: './submodules/analyst/analyst.module#AnalystModule',
        data: { rolesAllowed: Users.UserType.ANALYST },
        canActivate: [RoleGuard],
      },
      {
        path: 'executor',
        loadChildren: './submodules/executor/executor.module#ExecutorModule',
        data: { rolesAllowed: Users.UserType.EXECUTOR },
        canActivate: [RoleGuard],
      },
      // { path: 'frontdesk', loadChildren: '../submodules/frontdesk/frontdesk.module#FrontdeskModule' },
      // { path: 'access', loadChildren: '../submodules/access/access.module#AccessModule' },
      // { path: 'bookings', loadChildren: '../submodules/bookings/bookings.module#BookingsModule' },
      { path: '**', redirectTo: 'assistant' },
    ],
  },
];

@NgModule({
  imports: [CommonModule, RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MainRoutingModule {}
