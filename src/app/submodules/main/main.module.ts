import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MainComponent } from './main.component';
import { MainRoutingModule } from './main.routes';
import { ModalComponent } from './components/modals/modal.component';
import { PatientService } from './services/patient.service';
import { RequestModalComponent } from './components/modals/request/request.modal.component';
import { MainService } from './services/main.service';
import { SharedModule } from 'src/app/shared.module';
import { RequestService } from './services/request.service';
import { PatientModalComponent } from './components/modals/patient/patient.modal.component';
import { RBarComponent } from './components/rbar/rbar.component';
import { AuthorizationModalComponent } from './components/modals/authorization/authorization.modal.component';
import { AuthorizationService } from './services/authorization.service';
import { CodablesService } from './services/codables.service';
import { UserModalComponent } from './components/modals/user/user.modal.component';
import { UsersService } from './services/users.service';
import { MainNavbarComponent } from './components/navbar/navbar.component';
import { CSVModalComponent } from './components/modals/csv/csv.modal.component';
import { AnalystRequestModalComponent } from './components/modals/analyst-request/analyst-request.modal.component';
import { ExecutorsModalComponent } from './components/modals/executors/executors.modal.component';
import { OrdersService } from './services/orders.service';
import { CallModalComponent } from './components/modals/call/call.modal.componen';
import { CUPSModalComponent } from './components/modals/cups/cups.modal.component';
import { FormsModule } from 'ngx-3a';
import { NotificationsService } from './services/notifications.service';
import { OrderModalComponent } from './components/modals/order/order.modal.component';
import { DeleteRequestModalComponent } from './components/modals/delete-request/delete-request.modal.component';

@NgModule({
  declarations: [
    MainComponent,
    RBarComponent,
    MainNavbarComponent,
    ModalComponent,
    RequestModalComponent,
    CallModalComponent,
    PatientModalComponent,
    AuthorizationModalComponent,
    UserModalComponent,
    CSVModalComponent,
    OrderModalComponent,
    AnalystRequestModalComponent,
    ExecutorsModalComponent,
    CUPSModalComponent,
    DeleteRequestModalComponent,
  ],
  imports: [CommonModule, MainRoutingModule, SharedModule, FormsModule],
  exports: [],
  providers: [
    MainService,
    CodablesService,
    PatientService,
    RequestService,
    AuthorizationService,
    UsersService,
    OrdersService,
    NotificationsService,
  ],
})
export class MainModule { }
