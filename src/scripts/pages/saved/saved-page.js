import * as database from '../../data/database';
import SavedView from './saved-view';
import SavedPresenter from './saved-presenter';

export default class SavedPage {
  #view;
  #presenter;

  constructor() {
    this.#view = new SavedView();
    this.#presenter = new SavedPresenter({
      view: this.#view,
      model: database,
    });
  }

  async render() {
    return this.#view.getTemplate();
  }

  async afterRender() {
    await this.#presenter.init();
  }

  destroy() {
    this.#presenter.destroy();
    this.#view.destroy();
  }
}
