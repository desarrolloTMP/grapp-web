import { Injectable } from '@angular/core';
import { Modals, ModalEvent } from 'src/app/models/navigation';
import { Orders, Collections, Users, Clinics } from 'grapp-common-se';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { FormService, AuthenticationService } from 'ngx-3a';
import { SwitchComponent } from 'src/app/components/fields/switch/switch.field.component';
import { CodablesService } from './codables.service';
import { Observable, of, combineLatest, Subject } from 'rxjs';
import { Database } from '3a-common';
import { map, switchMap, tap, auditTime, debounceTime } from 'rxjs/operators';
import * as moment from 'moment';

@Injectable()
export class AuthorizationService {
  test = false;
  currentCIE10: Clinics.CodableConcept;
  constructor(
    private formSvc: FormService,
    private codesSvc: CodablesService,
    private db: Database.DatabaseService,
    private auth: AuthenticationService
  ) {

  }

  /**
   * An event for managing an existing request
   * @param request The existing request
   */
  requestAuthorizationEvent(request: Orders.Request, callback?: (r: Orders.Request) => void): ModalEvent {
    if (!request.order.cups) {
      request.order.cups = {
        codeDescription: '',
      };
    }

    if (!request.order.cie10){
      request.order.cie10 = {
        codeDescription: ""
      };
    }

    if (!request.order.file) {
      request.order.file = [
        ""
      ]
    }

      //request.order.isAuthorized = false
      //request.status = Orders.RequestStatus.CANCELED


    return {
      type: Modals.AUTHORIZATION,
      payload: { ...request },
      confirmation: {
        text: 'Guardar',
        callback: $request =>
          this.saveRequest($request as Orders.Request).pipe(
            map(savedRequest => {
              if (savedRequest) {
                if (callback) {
                  callback(savedRequest);
                }
                return true;
              }
              return false;
            })
          ),
      },
    };
  }

  /**
   * Saves the request beign authorized
   * @param request The request to be saved
   */
  saveRequest(request: Orders.Request): Observable<Orders.Request> {
    if (request.status === Orders.RequestStatus.REGISTERED && request.order.isAuthorized) {
      return this.prepareRequestForSave(request).pipe(switchMap($request => this.db.save($request, { name: Collections.REQUESTS })));
    } else {
      if (!request.order.isAuthorized && request.status == 0) {
        request.order.isAuthorized = false
        request.status = Orders.RequestStatus.CANCELED
        request.order.generalStatus = Orders.GeneralOrderStatus.CANCELED;
      } else if (request.order.isAuthorized && request.status == 4) {
        request.status = Orders.RequestStatus.APROOVED
        request.order.generalStatus = Orders.GeneralOrderStatus.INPROCESS;
      } else if (!request.order.isAuthorized && request.status == 1) {
        request.status = Orders.RequestStatus.CANCELED
        request.order.generalStatus = Orders.GeneralOrderStatus.CANCELED;
      }
      request.order.createdAt = new Date().getTime();
      request.verifierDoctor = {
        id: this.auth.user.getValue().id,
        name: this.auth.user.getValue().name,
        speciality: (this.auth.user.getValue()['specialty'] ? this.auth.user.getValue()['specialty'] : 'N/A') as Orders.Speciality,
      };
    }

    request.order.expirationDate = moment(request.createdAt).add(request.order.estimatedTime, 'd').valueOf();
    if (request.suborders) {
      for (let i = 0; i < request.suborders.length; i++) {
        request.suborders[i].expirationDate = moment()
          .add(request.suborders[i].estimatedTime, 'd')
          .valueOf();
      }
    }

    return this.db.save(request, { name: Collections.REQUESTS });
  }

  /**
   * Prepare a request to be saved will all related data preloaded
   * @param request The request to be saved
   */
  private prepareRequestForSave(request: Orders.Request): Observable<Orders.Request> {
    // Static preparations
    request.status = Orders.RequestStatus.APROOVED;
    request.order.status = Orders.OrderStatus.APROOVED;
    request.order.comments = [];
    request.order.generalStatus = Orders.GeneralOrderStatus.INPROCESS;
    request.order.authorizationDate = new Date().getTime();
    request.order.expirationDate = moment(request.createdAt).add(request.order.estimatedTime, 'd').valueOf();
    if (request.suborders) {
      for (let i = 0; i < request.suborders.length; i++) {
        request.suborders[i].expirationDate = moment()
          .add(request.suborders[i].estimatedTime, 'd')
          .valueOf();
      }
    }
    request.order.createdAt = new Date().getTime();
    request.verifierDoctor = {
      id: this.auth.user.getValue().id,
      name: this.auth.user.getValue().name,
      speciality: (this.auth.user.getValue()['specialty'] ? this.auth.user.getValue()['specialty'] : 'N/A') as Orders.Speciality,
    };
    // Async preparations
    return this.codesSvc.getCUPSByDescription(request.order.cups.codeDescription).pipe(
      switchMap(cups => {
        if (cups) {
          request.order.cups = cups;
          if (cups.excecutor && cups.excecutor.length) {
            return this.db.batchGet<Users.User>([cups.excecutor], [{ name: Collections.USERS }]).pipe(
              map(batchResults => {
                const executors = batchResults[Collections.USERS];
                request.order.executors = executors;
                return request;
              })
            );
          } else {
            return of(request);
          }
        } else {
          return of(request);
        }
      }),
      switchMap($request => {
        if ($request.suborders && $request.suborders.length) {
          const $suborders = $request.suborders.map((suborder, i) =>
            this.codesSvc.getCUPSByDescription(suborder.cups.codeDescription).pipe(map(subCups => ({ cups: subCups, index: i })))
          );
          return combineLatest($suborders).pipe(
            switchMap(cupsResults => {
              for (const subCups of cupsResults) {
                $request.suborders[subCups.index].cups = subCups.cups;
              }
              const $subordersExecutors = cupsResults.map(cr => {
                if (cr.cups.excecutor && cr.cups.excecutor.length) {
                  return this.db.batchGet<Users.User>([cr.cups.excecutor], [{ name: Collections.USERS }]).pipe(
                    map(batchResults => {
                      const executors = batchResults[Collections.USERS];
                      return { executors, index: cr.index };
                    })
                  );
                } else {
                  return of({ executors: [], index: cr.index });
                }
              });
              return combineLatest($subordersExecutors).pipe(
                map(subordersExecutorsResults => {
                  for (const executors of subordersExecutorsResults) {
                    $request.suborders[executors.index].executors = executors.executors;
                  }
                  return $request;
                })
              );
            })
          );
        } else {
          return of($request);
        }
      })
    );
  }


  /**
   * The fields needed to authorize a request
   */
  requestAuthorizationFields(callback?: (_: any) => void): FormlyFieldConfig[] {
    return [
      SwitchComponent.fieldWith('isAuthorized', '¿Autoriza?', undefined, undefined, callback),
      // SwitchComponent.fieldWith('isNewOrder', '¿Orden nueva?'),
      this.formSvc.textInput( 'cups.codeDescription', 'CUPS o Código propio medicamento', '', true, undefined, [], (field, event) => {
        this.codesSvc.getCUPSByQuieries(
          [{
              key: 'codeDescription',
              relation: Database.DatabaseQueryRelation.Contains,
              value: event
            }]
        ).subscribe(cc => {
          field.templateOptions['predictions'] = cc.map(c => c.codeDescription);
        });
      }),
      this.formSvc.textInput( 'cie10.codeDescription', 'Diagnóstico', '', true, undefined, [], (field, event) => {
        this.codesSvc.getCIE10ByQuieries(
          [{
              key: 'codeDescription',
              relation: Database.DatabaseQueryRelation.Contains,
              value: event
          }]
          ).subscribe(cc => {
            if (cc.length === 1) {
              this.currentCIE10 = cc[0];
            }
            field.templateOptions['predictions'] = cc.map(c => c.codeDescription);
          });
      }),
      SwitchComponent.fieldWith('isOrphan', '¿Es una enfermedad huérfana?', undefined, undefined, value => {
        this.test = value;
      }),
      {
        ...this.formSvc.textInput('orphanDiseaseName', 'Nombre enfermedad', '', true, undefined, [], (field, event) => {
          this.codesSvc.getEhrByQuieries(
            [{
              key: 'name',
              relation: Database.DatabaseQueryRelation.Contains,
              value: event
            }]
          ).subscribe(cc => {
            field.templateOptions['predictions'] = cc.map(c => c.name);
          });
        }),
        hideExpression: model => !model.isOrphan,
      },
      this.formSvc.numberInput('ammount', 'Cantidad', true),
      this.formSvc.numberInput('estimatedTime', 'Plazo de cumplimiento (en días)', true),
      this.formSvc.textareaInput( 'observations', 'Justificación autorizada', '', true),
    ];
  }

  /**
   * The fields needed to authorize a request
   */
  requestAuthorizationCancelationFields(callback?: (_: any) => void): FormlyFieldConfig[] {
    return [
      SwitchComponent.fieldWith('isAuthorized', '¿Autoriza?', undefined, undefined, callback),
      this.formSvc.textareaInput( 'noAuthObservations', 'Justificación no autorizada', '', true),
    ];
  }

  /**
   * The fields needed to create a sub-order inside a request
   */
  addSubOrderFields(): FormlyFieldConfig[] {
    // const prefix = 'suborders.' + index + '.';
    return [
      this.formSvc.textInput('cups.codeDescription', 'CUPS', '', true, undefined, [], (field, event) => {
        this.codesSvc.getCUPSByQuieries(
          [{
              key: 'codeDescription',
              relation: Database.DatabaseQueryRelation.Contains,
              value: event
            }]
          ).subscribe(cc => {
            field.templateOptions['predictions'] = cc.map(c => c.codeDescription);
          });
      }),
      this.formSvc.numberInput('ammount', 'Cantidad', true),
      this.formSvc.numberInput('estimatedTime', 'Plazo de cumplimiento (en días)', true),
      SwitchComponent.fieldWith('isPrerequisite', '¿Es un pre requisito?'),
    ];
  }
}
