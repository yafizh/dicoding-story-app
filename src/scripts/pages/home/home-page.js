import * as api from '../../data/api';
import HomeView from './home-view';
import HomePresenter from './home-presenter';

export default class HomePage {
  #view;
  #presenter;

  constructor() {
    this.#view = new HomeView();
    this.#presenter = new HomePresenter({
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

  destroy() {
    if (this.#view && typeof this.#view.destroy === 'function') {
      this.#view.destroy();
    }
  }
}

