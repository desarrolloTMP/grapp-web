import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { AuthComponent } from './auth.component';
import { LoginComponent } from './components/login/login.component';
import { LogoutComponent } from './components/logout/logout.component';

const routes: Routes = [
  {
    path: '',
    component: AuthComponent,
    children: [
      { path: 'logout', component: LogoutComponent },
      { path: 'login', component: LoginComponent },
      //   { path: 'login/:organization', component: LoginComponent },
      { path: 'complete/:token', component: LoginComponent },
      { path: 'complete/:email/:token', component: LoginComponent },
      { path: '**', redirectTo: 'login' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AuthRoutingModule {}
