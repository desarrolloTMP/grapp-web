import { Component, forwardRef, Inject } from '@angular/core';
import { Logger, AuthenticationService, FormService } from 'ngx-3a';
import { Router } from '@angular/router';
import { from, Observable, timer } from 'rxjs';
import { Users } from 'grapp-common-se';
import { MainService } from '../../services/main.service';
import { Menu } from 'src/app/models/navigation';

@Component({
  selector: 'app-main-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class MainNavbarComponent {
  version = require('../../../../../../package.json').version;

  logger: Logger = new Logger('Main Navbar');
  menuMobile = false;
  user: Users.User;

  isOptionOtherSelected = false;

  userDropDownActive = false;
  menu: Menu[] = [];

  constructor(public userSvc: AuthenticationService, public mainSvc: MainService, public router: Router, private formService: FormService) {
    // Se carga la información del usuario
    userSvc.user.subscribe(user => {
      if (!user || !user.id) {
        return;
      }
      this.user = user as Users.User;
    });
    mainSvc.navbar.subscribe(menu => (this.menu = menu));

  }

  /**
   *  Método que muestra una alerta para cerrar sesión, se cierra sesión si el usuario acepta
   */
  logout() {
    // this.mainSvc.alert.next({
    //   title: 'Estás a punto de salir de Mipresenlínea',
    //   content: '¿Deseas cerrar tu sesión en este navegador?',
    //   confirmation: {
    //     text: 'Cerrar sesión',
    //     callback: () => {
    //       timer(250).subscribe(() => this.router.navigateByUrl('/logout'));
    //       return true;
    //     },
    //   },
    //   cancelation: {
    //     text: 'Cancelar',
    //   },
    // });
    this.router.navigateByUrl('/logout');
  }
  /**
   *  Método que cambia el estado del menú en móvil
   */
  toggleMobile() {
    this.menuMobile = !this.menuMobile;
  }
  /**
   *  Método que cambia el estado del menú en móvil y cambia la dirección de la aplicación
   */
  navigate(a: string) {
    this.toggleMobile();
    this.router.navigateByUrl(a);
  }

  currentUrl(route) {
    return window.location.pathname === route ? 'btn-selected' : '';

  }
}
