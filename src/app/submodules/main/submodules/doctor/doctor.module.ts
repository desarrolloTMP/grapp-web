import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from 'src/app/shared.module';
import { DoctorRoutingModule } from './doctor.routes';
import { DoctorComponent } from './doctor.component';
import { DoctorService } from './services/doctor.service';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [DoctorComponent],
  imports: [CommonModule, DoctorRoutingModule, SharedModule, FormsModule],
  exports: [],
  providers: [DoctorService],
})
export class DoctorModule { }
