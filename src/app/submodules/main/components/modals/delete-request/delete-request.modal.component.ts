import { Component, OnInit, Input, ViewChild, Inject, PLATFORM_ID } from '@angular/core';

// 3a Libraries
import { BasicFormComponent, AuthenticationService } from 'ngx-3a';
import { RequestStatus } from 'grapp-common-se/dist/orders/request';
import { OrderStatus } from 'grapp-common-se/dist/orders';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { User } from '3a-common/dist/authentication';
import { Orders } from 'grapp-common-se';

// Components
import { ModalBaseComponent } from '../modal.base.component';

// Services
import { OrdersService } from '@services';

// Enviroments
import { environment } from 'src/environments/environment';

interface RequestEvent {
  request: Orders.Request;
  justification: string
}

@Component( {
  selector: 'app-delete-request-modal',
  templateUrl: './delete-request.modal.component.html',
} )
export class DeleteRequestModalComponent extends ModalBaseComponent implements OnInit {
  @ViewChild( 'form' ) basicForm: BasicFormComponent;

  // Inputs
  @Input() set _request( request: Orders.Request ) {
    if ( request ) {
      this.request = { ...request };
    }
  }

  request: Orders.Request;
  fields: FormlyFieldConfig[];
  successFields: FormlyFieldConfig[];
  private user: User;

  constructor(
    private authenticationService: AuthenticationService,
    private ordersSvc: OrdersService,
  ) {
    super();

    this.initUserInfo();
  }

  ngOnInit(): void {
    this.initComponentData();
  }

  private initUserInfo() {
    this.authenticationService.user.subscribe( user => {
      this.user = user;
    } )
  }

  initComponentData() {
    this.fields = this.ordersSvc.addDeleteOrderFields();
  }

  verifyRequest( event: RequestEvent ) {

    let $request = event.request;
    const deleteInfo = {
      date: new Date().getTime(),
      observation: event.justification,
      userID: this.user
    };

    $request.status = RequestStatus.DELETED;

    // Principal order
    $request.order = {
      ...$request.order,
      deleteObservations: deleteInfo
    };

    this.confirm($request);
  }

  submit() {
    this.basicForm.send();
  }
}
