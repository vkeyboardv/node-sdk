import { Corva } from '@corva/node-sdk';

interface TaskProps {
  some: { input: string };
}

interface DatasetRecord {
  // eslint-disable-next-line camelcase
  data: { some_valuable_prop: number };
}

/**
 *  This will appear in {@link Task.payload}
 */
interface TaskOutput {
  opts: string;
  some: {
    output: number;
  };
}

const timezonesShift: Record<string, number> = {
  'America/Chicago': 6,
};

export const handler = new Corva().task<TaskProps, void>(async (event, { api }) => {
  // get some data from api
  const settings = await api.getAppSettings();
  // now - 7 days + timezone shift
  const timestampToLoadDataFrom = Date.now() / 1000 - 7 * 24 * 60 * 60 + timezonesShift[settings.timezone] || 0;

  const results = await api.getDataset<DatasetRecord>({
    dataset: 'some-dataset',
    query: {
      timestamp: { $gte: timestampToLoadDataFrom },
    },
    sort: { timestamp: 1 },
    limit: 1000,
    fields: ['data.some_valuable_prop'],
  });

  // do some calculations
  const sum = results.reduce((acc, item) => acc + item.data.some_valuable_prop, 0);

  // save the results somewhere
  await api
    .provider('some-provider')
    .dataset<TaskOutput>('some-dataset')
    .createEntry(
      {
        opts: event.properties.some.input,
        some: { output: sum },
      },
      { timestamp: Date.now() },
    );
});
