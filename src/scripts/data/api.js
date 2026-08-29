import CONFIG from '../config';

const ENDPOINTS = {
  REGISTER: `${CONFIG.BASE_URL}/register`,
  LOGIN: `${CONFIG.BASE_URL}/login`,
  STORIES: `${CONFIG.BASE_URL}/stories`,
  STORY_DETAIL: (id) => `${CONFIG.BASE_URL}/stories/${id}`,
};

export async function register({ name, email, password }) {
  try {
    const response = await fetch(ENDPOINTS.REGISTER, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, password }),
    });

    const responseJson = await response.json();

    if (!response.ok) {
      throw new Error(responseJson.message || 'Pendaftaran gagal');
    }

    return responseJson;
  } catch (error) {
    console.error('API Error in register:', error);
    throw error;
  }
}

export async function login({ email, password }) {
  try {
    const response = await fetch(ENDPOINTS.LOGIN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const responseJson = await response.json();

    if (!response.ok) {
      throw new Error(responseJson.message || 'Login gagal');
    }

    return responseJson.loginResult;
  } catch (error) {
    console.error('API Error in login:', error);
    throw error;
  }
}

export async function getAllStories(token = null) {
  try {
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(ENDPOINTS.STORIES, { headers });
    const responseJson = await response.json();

    if (!response.ok) {
      throw new Error(responseJson.message || 'Gagal memuat data cerita');
    }

    return responseJson.listStory || [];
  } catch (error) {
    console.error('API Error in getAllStories:', error);
    throw error;
  }
}

export async function getStoryDetail(id, token = null) {
  try {
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(ENDPOINTS.STORY_DETAIL(id), { headers });
    const responseJson = await response.json();

    if (!response.ok) {
      throw new Error(responseJson.message || 'Gagal memuat detail cerita');
    }

    return responseJson.story;
  } catch (error) {
    console.error('API Error in getStoryDetail:', error);
    throw error;
  }
}