import * as api from '../../data/api';
import LoginView from './login-view';
import LoginPresenter from './login-presenter';

export default class LoginPage {
  #view;
  #presenter;

  constructor() {
    this.#view = new LoginView();
    this.#presenter = new LoginPresenter({
      view: this.#view,
      model: api,
    });
  }

  async render() {
    return this.#view.getTemplate();
  }

  async afterRender() {
    await this.#presenter.init();
  }
}
