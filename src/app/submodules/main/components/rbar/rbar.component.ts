import { Component, OnInit, HostListener, ViewChild, AfterViewChecked, OnDestroy } from '@angular/core';
import { MainService } from '../../services/main.service';
import { FormService, BasicFormComponent } from 'ngx-3a';
import { ModalBaseComponent } from '../modals/modal.base.component';
import { Action } from 'src/app/models/navigation';
import { Observable, Subscription } from 'rxjs';
import { RBarEvent } from '../../models/rbar';
import { FormlyFieldConfig } from '@ngx-formly/core';

@Component({
  selector: 'app-rbar',
  templateUrl: './rbar.component.html',
})
export class RBarComponent extends ModalBaseComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild( 'form' ) form: BasicFormComponent;

  rbarEvent: RBarEvent;
  tabSelected = 0;

  filterFields: FormlyFieldConfig[];
  filterModel: Object = {};

  columnOptions: FormlyFieldConfig[];
  columnModel: { columns: string[]; } = { columns: [] };

  initDateSuscription: Subscription;

  // Flags
  isFormChanged: boolean;

  constructor(private main: MainService, private formSvc: FormService ) {
    super(main);
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      if (this.rbarEvent) {
        this.handleAction(this.rbarEvent.confirmation);
      }
    }
  }

  ngOnInit(): void {
    this.main.toogleRBar.subscribe(rb => this.loadRBarEvent(rb));
  }

  ngAfterViewChecked(): void {

    if ( this.form && this.form._form.contains( 'initial_date' ) && !this.initDateSuscription  ) {

      this.initDateSuscription = this.form._form.get( 'initial_date' ).valueChanges.subscribe( value => {

        if ( this.form._form.contains( 'final_date' ) && this.isFormChanged ) {
          this.form._form.controls[ 'final_date' ].setValue( null );
          delete this.filterModel[ 'final_date' ];
        }
        this.isFormChanged = true;

      } );
    }
  }

  loadRBarEvent( event: RBarEvent ) {

    this.isFormChanged = false;
    this.rbarEvent = event;
    this.filterFields = event.filterOptions;
    this.filterModel = event.filterModel || {};
    this.columnOptions = [
      this.formSvc.relationInput(
        'columns',
        '',
        event.datatableColumns.map(dt => ({ value: dt.prop, label: dt.name })),
        false,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        false
      ),
    ];
    this.columnModel.columns = event.datatableColumns.filter(dt => dt.visible).map(dt => dt.prop);

  }

  /**
   * Handles the logic to perform an specific action in the modal
   * @param action The actio sent by the event
   */
  handleAction( action?: Action ) {

    this.clearEmptyFileds();

    if (action && action.callback) {
      const response = action.callback( { ...this.columnModel, filterResults: this.filterModel } );

      if ((<Observable<boolean>>response).subscribe) {
        (<Observable<boolean>>response).subscribe(done => {
          if (done) {
            this.close();
          }
        });
      } else {
        if (response as boolean) {
          this.close();
        }
      }
    } else {
      this.close();
    }
  }

  /**
   * Avoids sending empty attributes in the filter object
   */
  clearEmptyFileds() {
    this.form._fields.forEach( field => {
      if (
        field.formControl.value === null ||
        field.formControl.value === 'null' ||
        field.formControl.value === '' ||
        field.formControl.value === undefined
      ) {
        delete this.filterModel[ field.key ];
      }
    });
  }

  close() {
    this.cancel();
    this.rbarEvent = undefined;
    this.tabSelected = 0;
  }

  checkOptions(): boolean {
    return this.columnOptions && !!(this.columnOptions[0].templateOptions.options as any[]).length;
  }

  ngOnDestroy() {
    if ( this.initDateSuscription ) {
      this.initDateSuscription.unsubscribe();
    }
  }

}
