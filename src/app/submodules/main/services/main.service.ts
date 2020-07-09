import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { ModalEvent, AlertEvent, Menu } from 'src/app/models/navigation';
import { RBarEvent } from '../models/rbar';

@Injectable()
export class MainService {
  public toogleModal: Subject<ModalEvent> = new Subject();
  public toogleRBar: Subject<RBarEvent> = new Subject();
  public alert: Subject<AlertEvent> = new Subject();
  public navbar: Subject<Menu[]> = new Subject();
  constructor() {}
}
