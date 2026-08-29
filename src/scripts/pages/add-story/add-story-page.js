import * as api from '../../data/api';
import AddStoryView from './add-story-view';
import AddStoryPresenter from './add-story-presenter';

export default class AddStoryPage {
  #view;
  #presenter;

  constructor() {
    this.#view = new AddStoryView();
    this.#presenter = new AddStoryPresenter({
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
    if (this.#presenter && typeof this.#presenter.destroy === 'function') {
      this.#presenter.destroy();
    }
  }
}
