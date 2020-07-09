import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { AnalystComponent } from './analyst.component';

const routes: Routes = [
  {
    path: '',
    component: AnalystComponent,
  },
];

@NgModule({
  imports: [CommonModule, RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AnalystRoutingModule { }
