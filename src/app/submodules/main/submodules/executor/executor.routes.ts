import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { ExecutorComponent } from './executor.component';

const routes: Routes = [
  {
    path: '',
    component: ExecutorComponent,
  },
];

@NgModule({
  imports: [CommonModule, RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ExecutorRoutingModule { }
