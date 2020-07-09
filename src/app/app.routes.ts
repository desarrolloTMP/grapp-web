import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { BasicGuard } from 'ngx-3a';

const routes: Routes = [
  { path: 'auth', loadChildren: './submodules/auth/auth.module#AuthModule' },
  {
    path: 'app',
    loadChildren: './submodules/main/main.module#MainModule',
    canActivate: [BasicGuard],
  },
  { path: 'login', redirectTo: 'auth' },
  { path: 'logout', redirectTo: 'auth/logout' },
  { path: '', redirectTo: 'auth', pathMatch: 'full' },
  { path: '**', redirectTo: 'auth' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
