import AboutView from './about-view';
import AboutPresenter from './about-presenter';

export default class AboutPage {
  #view;
  #presenter;

  constructor() {
    this.#view = new AboutView();
    this.#presenter = new AboutPresenter({
      view: this.#view,
    });
  }

  async render() {
    return this.#view.getTemplate();
  }

  async afterRender() {
    await this.#presenter.init();
  }
}
