import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AuthComponent } from './auth.component';
import { SharedModule } from '../../shared.module';
import { LoginComponent } from './components/login/login.component';
import { AuthRoutingModule } from './auth.routes';
import { SecurityService } from './services/security.service';
import { LogoutComponent } from './components/logout/logout.component';

@NgModule({
  imports: [CommonModule, AuthRoutingModule, SharedModule],
  declarations: [AuthComponent, LoginComponent, LogoutComponent],
  exports: [],
  providers: [SecurityService],
  bootstrap: [AuthComponent],
})
export class AuthModule {}
