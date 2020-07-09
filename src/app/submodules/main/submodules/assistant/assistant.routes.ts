import { AssistantComponent } from './assistant.component';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';

const routes: Routes = [
  {
    path: '',
    component: AssistantComponent,
  },
];

@NgModule({
  imports: [CommonModule, RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AssistantRoutingModule {}
