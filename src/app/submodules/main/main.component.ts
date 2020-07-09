import { Component, OnInit } from '@angular/core';
import { Database } from '3a-common';
import { Users, Collections } from 'grapp-common-se';
import * as faker from 'faker/locale/es_MX';
import { Logger } from 'ngx-3a';
@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
})
export class MainComponent implements OnInit {
  logger: Logger = new Logger('Main', false);
  constructor() {}

  ngOnInit(): void {
  }
}
