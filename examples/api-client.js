const { Corva } = require('@corva/node-sdk');

const scheduledApp = async (event, { api }) => {
  // Corva API calls
  await api.request('/v2/pads', {
    searchParams: { param: 'val' },
  });
  await api.request('/v2/pads', {
    method: 'POST',
    json: { key: 'val' },
  });
  await api.request('/v2/pads', {
    method: 'PUT',
    json: { key: 'val' },
  });
  await api.request('/v2/pads', {
    method: 'DELETE',
  });

  // Corva Data API calls
  await api.request('api/v1/data/provider/dataset/', {
    searchParams: { param: 'val' },
  });
  await api.request('api/v1/data/provider/dataset/', {
    method: 'POST',
    json: { key: 'val' },
  });
  await api.request('api/v1/data/provider/dataset/', {
    method: 'PUT',
    json: { key: 'val' },
  });
  await api.request('api/v1/data/provider/dataset/', {
    method: 'DELETE',
  });

  return { status: 'OK' };
};

exports.handler = new Corva().scheduled(scheduledApp);
