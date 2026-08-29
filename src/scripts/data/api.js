import CONFIG from '../config';

const ENDPOINTS = {
  REGISTER: `${CONFIG.BASE_URL}/register`,
  LOGIN: `${CONFIG.BASE_URL}/login`,
  STORIES: `${CONFIG.BASE_URL}/stories`,
  STORIES_GUEST: `${CONFIG.BASE_URL}/stories/guest`,
  STORY_DETAIL: (id) => `${CONFIG.BASE_URL}/stories/${id}`,
  SUBSCRIBE: `${CONFIG.BASE_URL}/notifications/subscribe`,
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

export async function getAllStories(token = null, options = {}) {
  try {
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const queryParams = new URLSearchParams();
    if (options.location !== undefined) {
      queryParams.append('location', options.location);
    } else {
      // Default to location=1 to fetch stories with coordinates when available
      queryParams.append('location', 1);
    }
    if (options.page !== undefined) queryParams.append('page', options.page);
    if (options.size !== undefined) queryParams.append('size', options.size);

    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const response = await fetch(`${ENDPOINTS.STORIES}${queryString}`, { headers });
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

export async function addStory({ description, photo, lat, lon }, token = null) {
  try {
    const formData = new FormData();
    formData.append('description', description);
    formData.append('photo', photo);

    if (lat !== null && lat !== undefined && lat !== '') {
      formData.append('lat', parseFloat(lat));
    }
    if (lon !== null && lon !== undefined && lon !== '') {
      formData.append('lon', parseFloat(lon));
    }

    const headers = {};
    let endpoint = ENDPOINTS.STORIES;

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else {
      endpoint = ENDPOINTS.STORIES_GUEST;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: formData,
    });

    const responseJson = await response.json();

    if (!response.ok) {
      throw new Error(responseJson.message || 'Gagal menambahkan cerita');
    }

    return responseJson;
  } catch (error) {
    console.error('API Error in addStory:', error);
    throw error;
  }
}

export async function subscribePushNotification({ endpoint, keys: { p256dh, auth } }, token) {
  try {
    const response = await fetch(ENDPOINTS.SUBSCRIBE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ endpoint, keys: { p256dh, auth } }),
    });

    const responseJson = await response.json();

    if (!response.ok) {
      throw new Error(responseJson.message || 'Gagal berlangganan push notification');
    }

    return responseJson;
  } catch (error) {
    console.error('API Error in subscribePushNotification:', error);
    throw error;
  }
}

export async function unsubscribePushNotification({ endpoint }, token) {
  try {
    const response = await fetch(ENDPOINTS.SUBSCRIBE, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ endpoint }),
    });

    const responseJson = await response.json();

    if (!response.ok) {
      throw new Error(responseJson.message || 'Gagal berhenti berlangganan push notification');
    }

    return responseJson;
  } catch (error) {
    console.error('API Error in unsubscribePushNotification:', error);
    throw error;
  }
}
