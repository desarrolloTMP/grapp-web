import { OnInit, OnDestroy } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export class BaseComponent implements OnInit, OnDestroy {
  private unsubscribe$ = new Subject();

  constructor() {}

  ngOnInit() {}

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  observable<T>(observable: Observable<T>): Observable<T> {
    return observable.pipe(takeUntil(this.unsubscribe$));
  }
}
