import * as api from '../../data/api';
import { parseActivePathname } from '../../routes/url-parser';
import StoryDetailView from './story-detail-view';
import StoryDetailPresenter from './story-detail-presenter';

export default class StoryDetailPage {
  #view;
  #presenter;

  constructor() {
    this.#view = new StoryDetailView();
    this.#presenter = new StoryDetailPresenter({
      view: this.#view,
      model: api,
    });
  }

  async render() {
    return this.#view.getTemplate();
  }

  async afterRender() {
    const { id } = parseActivePathname();
    await this.#presenter.init(id);
  }

  destroy() {
    if (this.#view && typeof this.#view.destroy === 'function') {
      this.#view.destroy();
    }
  }
}
