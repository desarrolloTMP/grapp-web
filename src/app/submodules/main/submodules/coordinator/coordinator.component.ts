import { Component, OnInit } from '@angular/core';
import { BaseComponent } from 'src/app/components/base/base.component';
import { MainService } from '../../services/main.service';
import { AuthenticationService } from 'ngx-3a';
import { Users } from 'grapp-common-se';
import { Router } from '@angular/router';

@Component({
  selector: 'app-coordinator',
  templateUrl: './coordinator.component.html',
  // styleUrls: ['./coordinator.component.scss']
})
export class CoordonatorComponent extends BaseComponent implements OnInit {
  constructor(main: MainService, private auth: AuthenticationService, private router: Router) {
    super();
    main.navbar.next([
      {
        route: '/app/coordinator/users',
        title: 'Usuarios',
      },
      {
        route: '/app/coordinator/patients',
        title: 'Pacientes',
      },
      {
        route: '/app/coordinator/cups',
        title: 'CUPS',
      },
      {
        route: '/app/coordinator/cie10',
        title: 'CIE10',
      },
      {
        route: '/app/coordinator/ehr',
        title: 'EH-R',
      },
      {
        route: '/app/coordinator/orders',
        title: 'Solicitudes',
      },
      {
        route: '/app/coordinator/analytics',
        title: 'Analíticas',
      },
    ]);
  }

  ngOnInit(): void {
    this.auth.user.subscribe(u => {
      if (u && u['userType'] !== Users.UserType.COORDINATOR) {
        this.router.navigateByUrl('/logout');
      }
    });
  }
}
