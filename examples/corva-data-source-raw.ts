import { Corva } from '@corva/node-sdk';

type Movie = {
  id: number;
};

export const handler = new Corva().scheduled(async (event, { api, secrets }) => {
  // Call any URL
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  await api.raw<Movie>('https://api.themoviedb.org/3/movie/76341', {
    searchParams: { api_key: (secrets as Record<string, string>).api_key },
  });

  return { status: 'OK' };
});
