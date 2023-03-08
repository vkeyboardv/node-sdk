import { Corva } from '@corva/node-sdk';

export const handler = new Corva().scheduled(async (event, { api }) => {
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
});
