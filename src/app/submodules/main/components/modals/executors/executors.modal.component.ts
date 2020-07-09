import { Component, OnInit, Input, AfterViewInit, Output, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ModalBaseComponent } from '../modal.base.component';
import { MainService } from '../../../services/main.service';
import { Orders, Users, Clinics } from 'grapp-common-se';
import { UsersService } from '../../../services/users.service';
import { Database } from '3a-common';
import { Logger, AuthenticationService } from 'ngx-3a';
import { environment } from 'src/environments/environment';
import { analyzeAndValidateNgModules } from '@angular/compiler';
import { IDType, UserType } from 'grapp-common-se/dist/users';

@Component({
  selector: 'app-executors-modal',
  templateUrl: './executors.modal.component.html',
  styleUrls: ['./executors.modal.component.scss'],
})
export class ExecutorsModalComponent extends ModalBaseComponent implements OnInit, AfterViewInit {
  executors: Users.User[] = [];
  preferredExecutors: Users.User[] = [];
  noPreferredExecutors = 0;
  searchQuery = '';
  existsNotPreferedAndSelectedExecutors = false;
  _order: Orders.Order;

  @Input() set order(order: Orders.Order) {
    this._order = JSON.parse(JSON.stringify(order));
  }

  logger: Logger = new Logger('ExecutorModal', environment.production);
  user: any;

  constructor(main: MainService, private userSvc: UsersService,
    private authenticationSvc: AuthenticationService,
    private changeDetector: ChangeDetectorRef) {
    super(main);
  }

  ngOnInit(): void {
    this.authenticationSvc.user.subscribe(user => {
      if (user) {
        this.user = user;
      }
    });
    this.observable(
      this.userSvc.getUsersByQueries([
        {
          key: 'userType',
          relation: Database.DatabaseQueryRelation.Equal,
          value: Users.UserType.EXECUTOR,
        },
      ])
    ).subscribe(executros => this.loadPreferredExecutors(executros));
  }

  ngAfterViewInit(): void { }

  loadPreferredExecutors(executors) {
    this.executors = executors;
    if (this._order) {
      if (!this._order.executors) {
        this._order.executors = [];
      }
      this.preferredExecutors =
        ((this._order.cups && this._order.cups.excecutor) ? this._order.cups.excecutor.map(id => {
          return executors.find(e => e.id === id);
        }) : []);
    }

    this.changeDetector.detectChanges();
    this.validateAllExecutors();
  }

  validateAllExecutors() {
    let cont = 0;
    for (let i = 0; i < this.executors.length; i++) {
      if (this.isNotPreferedAndSelected(this.executors[i])) { cont++; }
    }
    this.existsNotPreferedAndSelectedExecutors = cont > 0 ? true : false;
  }
  /**
   * Looks if a specific executor is already selected
   * @param executor The  executor to be looked
   */
  isSeleceted(executor: Users.User, from?): boolean {

    return !!this._order.executors.find(e => e.id === executor.id);
  }
  isPrefered(executor: Users.User): boolean {
    return !!this.preferredExecutors.find(e => e.id === executor.id);
  }
  isNotPreferedAndSelected(executor: Users.User) {
    return this.isSeleceted(executor) && !this.isPrefered(executor);
  }

  simplifyID(id: string) {
    return id.replace(/([A-Z])*([a-z])*/g, '');
  }

  /**
   * Add or remove an executor from the _order
   * @param executor The executor to be added/removed
   */
  toogleExecutor(executor: Users.User) {
    const index = this._order.executors.findIndex(e => e.id === executor.id);
    if (index > -1) {
      this._order.executors.splice(index, 1);
    } else {
      this._order.executors.push(executor);
      this.addComment(executor);
    }
    this.logger.log('Order Executors', this._order);
  }

  /*
   *  when the executor add other executor in the _order, this void creates a new comment
  */
  addComment(executor: Users.User) {
    const message: Orders.OrderComment = {};
    message.destinatary = {
      name: 'Todos los ejecutores', idType: IDType.CC, userType: UserType.EXECUTOR,
      document: '*', address: { city: '*', country: '*', full: '*' }
    };
    message.date = new Date().getTime();
    message.sender = this.user;
    message.content = this.user.name + ' Asignó a ' + executor.name + ' como ejecutor';
    if (!this._order.comments) {
      this._order.comments = [];
    }
    this._order.comments.push(message);
    this.changeDetector.detectChanges();
  }
}
