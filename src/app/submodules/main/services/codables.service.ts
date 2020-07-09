import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Clinics, Users } from 'grapp-common-se';
import { Database } from '3a-common';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { FormService, SelectOption } from 'ngx-3a';
import { UsersService } from './users.service';
import { map } from 'rxjs/operators';
import { ModalEvent, Modals } from 'src/app/models/navigation';

@Injectable()
export class CodablesService {
  private _cups: string[];
  private _cie10: string[];
  private _ehr: string[];

  /**
   * Array of booleans that defines if a CIE10 in certain position of the array isOrphanDesease
   */
  private _cie10OD: boolean[] = [];

  /**
   * Array of CIE10 string that corresponds to an Orphan Desease
   */
  private ehrCIE10: string[] = [];

  constructor(private db: Database.DatabaseService, private formSvc: FormService, private userSvc: UsersService) {
    // this.recursiveLoad(page => this.getCUPSByQuieries([], page), () => this._cups, _ => (this._cups = _), c => c.codeDescription);
    // this.recursiveLoad(
    //   page => this.getCIE10ByQuieries([], page),
    //   () => this._cie10,
    //   _ => (this._cie10 = _),
    //   c => {
    //     this._cie10OD.push(c.isOrphanDisease);
    //     return c.codeDescription;
    //   }
    // );
    // this.recursiveLoad(
    //   page => this.getEhrByQuieries([], page),
    //   () => this._ehr,
    //   _ => (this._ehr = _),
    //   c => {
    //     this.ehrCIE10.push(c.cie10);
    //     return c.name;
    //   }
    // );
  }

  recursiveLoad(
    loader: (page: number) => Observable<any[]>,
    getter: () => any[],
    setter: (items: any[]) => void,
    mapper: (item: any) => any,
    page = 0
  ) {
    loader(page).subscribe(items => {
      if (items && items.length) {
        setter([...(getter() || []), ...items.map(mapper)]);
        this.recursiveLoad(loader, getter, setter, mapper, ++page);
      }
    });
  }

  cie10Options() {
    return this._cie10;
  }

  cupsOptions() {
    return this._cups;
  }
  ehrOptions() {
    return this._ehr;
  }

  getCUPSByQuieries(queries: Database.DatabaseQuery[] = [], page = 0): Observable<Clinics.CUPS[]> {
    return this.db.find(queries, { name: 'Cups', lastIndex: 100 * page });
  }

  getCUPSByDescription(description: string): Observable<Clinics.CUPS> {
    return this.getCUPSByQuieries([
      {
        key: 'codeDescription',
        value: description,
        relation: Database.DatabaseQueryRelation.Equal,
      },
    ]).pipe(
      map(cups => {
        if (cups && cups.length) {
          return cups[0];
        } else {
          return null;
        }
      })
    );
  }

  getCIE10ByQuieries(queries: Database.DatabaseQuery[] = [], page = 0): Observable<Clinics.CodableConcept[]> {
    return this.db.find(queries, { name: 'Cie10', lastIndex: 100 * page });
  }

  isCIE10OrphanDesease(description: string) {
    return this.getCIE10ByQuieries([
      {
        key: 'codeDescription',
        value: description,
        relation: Database.DatabaseQueryRelation.Equal,
      }
    ]).pipe(
      map(cups => {
        if (cups && cups.length) {
          return cups[0]['isOrphanDisease'];
        } else {
          return false;
        }
      })
    );
  }

  getCIE10WithEHRCode(code: string) {
    const position = this._cie10.indexOf(code);
    return this._cie10[position];
  }

  getEHRWithCIE10(description: string) {
    if (description.split(' ').length) {
      const code = description.split(' ')[0];
      return this.getEhrByQuieries([
        {
          key: 'cie10',
          value: code,
          relation: Database.DatabaseQueryRelation.Equal,
        }
      ]).pipe(
        map(ehr => {
          if (ehr && ehr.length) {
            return ehr[0].name;
          } else {
            return false;
          }
        })
      );
    }
  }

  /**
   * Create an editing modal event for a cups
   * @param cups The cups to be edited
   * @param callback (Optional) Callback for caller
   */
  addCUPSEvent(cups: Clinics.CUPS, callback?: (_: Clinics.CUPS) => void): ModalEvent {
    return {
      type: Modals.CUPS,
      payload: cups,
      confirmation: {
        text: '',
        callback: $cups => {
          return this.db.save($cups, { name: 'Cups' }).pipe(
            map($$cups => {
              if (callback) {
                callback($$cups);
              }
              return true;
            })
          );
        },
      },
    };
  }

  /**
   * The fields required to edit a cups
   */
  addCUPSFields(): FormlyFieldConfig[] {
    return [
      this.formSvc.relationInput(
        'excecutor',
        '',
        this.userSvc
          .getUsersByQueries([
            {
              key: 'userType',
              value: Users.UserType.EXECUTOR,
              relation: Database.DatabaseQueryRelation.Equal,
            },
          ])
          .pipe(map(users => users.map<SelectOption>(user => ({ label: user.name, value: user.id })))),
        false
      ),
    ];
  }

  getEhrByQuieries(queries: Database.DatabaseQuery[] = [], page = 0): Observable<Clinics.EHR[]> {
    return this.db.find(queries, { name: 'Ehr', lastIndex: 100 * page });
  }
}
