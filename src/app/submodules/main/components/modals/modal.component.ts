import { Component, OnInit, Optional } from '@angular/core';
import { BaseComponent } from 'src/app/components/base/base.component';
import { MainService } from '../../services/main.service';
import { timer, Observable } from 'rxjs';
import { ModalEvent, AlertEvent, Modals, Action } from 'src/app/models/navigation';
import { tap } from 'rxjs/operators';
import { Logger } from 'ngx-3a';
import { environment } from 'src/environments/environment';

const ANIMATION_TIME = 200;

@Component( {
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: [ './modal.component.scss' ],
} )
export class ModalComponent extends BaseComponent implements OnInit {
  logger: Logger = new Logger( 'ModalComponent', environment.production );
  event: ModalEvent;
  alert: AlertEvent;
  _errorMessages: string[];

  visible = false;
  alertVisible = false;
  loading = false;

  store: {[_: string]: any};

  constructor( protected mainSvc?: MainService ) {
    super();

    this.store = {};
  }

  ngOnInit() {
    super.ngOnInit();

    if ( this.mainSvc){

      this.observable( this.mainSvc.toogleModal ).subscribe( event => {
        if ( event && event.type !== -1 ) {
          this.event = event;
          timer( ANIMATION_TIME ).subscribe( () => this.visible = true );
        } else {
          this.visible = false;
          timer( ANIMATION_TIME ).subscribe( () => this.event = event );
        }
      } );
  
      this.observable( this.mainSvc.alert ).subscribe( alert => {
        if ( alert && !!alert.title ) {
          this.alert = alert;
          timer( ANIMATION_TIME ).subscribe( () => ( this.alertVisible = true ) );
        } else {
          this.alertVisible = false;
          timer( ANIMATION_TIME ).subscribe( () => ( this.alert = alert ) );
        }
      } );
    }

  }

  close() {
    this.store.openCallModalCanceled = undefined;
    const commonTimer = timer( ANIMATION_TIME ).pipe( tap( () => ( this.loading = false ) ) );
    if ( this.alertVisible ) {
      this.logger.log( 'Alert closed' );
      this.alertVisible = false;
      commonTimer.subscribe( () => ( this.alert = undefined ) );
    } else {
      this.logger.log( 'Modal closed' );
      this.visible = false;
      commonTimer.subscribe( () => ( this.event = { type: Modals.NONE } ) );
    }
  }

  /**
   * Handles the logic to perform an specific action in the modal
   * @param action The actio sent by the event
   */
  handleAction( action?: Action, payload?: { [ _: string ]: any; } ) {
    this.loading = true;

    if ( action && action.callback ) {

      const response = action.callback( payload );

      if ( ( <Observable<boolean>> response ).subscribe ) {

        ( <Observable<boolean>> response ).subscribe( done => {
          if ( done ) {
            this.close();
          } else {
            this._errorMessages = [ 'No se pudo completar la acción' ];
          }
        }, error => {
          console.log('Error en la accion: ', error);
          this._errorMessages = [ 'No se pudo completar la acción' ];
        } );
      } else {
        if ( response as boolean ) {
          this.close();
        } else {
          this._errorMessages = [ 'No se pudo completar la acción' ];
        }
      }
    } else {
      this.close();
    }
  }
}
