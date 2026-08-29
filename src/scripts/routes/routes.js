import HomePage from '../pages/home/home-page';
import AboutPage from '../pages/about/about-page';
import RegisterPage from '../pages/register/register-page';
import LoginPage from '../pages/login/login-page';
import AddStoryPage from '../pages/add-story/add-story-page';
import StoryDetailPage from '../pages/story-detail/story-detail-page';

const routes = {
  '/': new HomePage(),
  '/about': new AboutPage(),
  '/add-story': new AddStoryPage(),
  '/stories/:id': new StoryDetailPage(),
  '/register': new RegisterPage(),
  '/login': new LoginPage(),
};

export default routes;
