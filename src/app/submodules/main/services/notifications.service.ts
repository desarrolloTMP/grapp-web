import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MicroServices } from 'ngx-3a';
import { APIResponse } from '3a-common';
import { Observable } from 'rxjs';

@Injectable()
export class NotificationsService {
  constructor(private microService: MicroServices) {}

  send(title: string, content: string, email: string): Observable<APIResponse> {
    const emailData = {
      email,
      subject: title,
      text: content,
    };
    return this.microService.post<any, APIResponse>('notification/send', emailData);
  }
}
