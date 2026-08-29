import * as api from '../../data/api';
import RegisterView from './register-view';
import RegisterPresenter from './register-presenter';

export default class RegisterPage {
  #view;
  #presenter;

  constructor() {
    this.#view = new RegisterView();
    this.#presenter = new RegisterPresenter({
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
