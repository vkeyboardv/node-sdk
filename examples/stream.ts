/* eslint-disable camelcase */
import { Corva, FilteringMode, StreamTimeEvent } from '@corva/node-sdk';

type Drillstring = {
  bit_depth: number;
  gamma_ray: number;
  components: {
    gamma_sensor_to_bit_distance: number;
  }[];
};

export const handler = new Corva().stream(
  async (event: StreamTimeEvent<Drillstring>, { api }) => {
    // do some calculations/modifications to the data
    const total = event.records.reduce((acc, drillstring) => acc + drillstring.data.bit_depth, 0);
    const average = total / event.records.length;

    // save the data to private collection
    await api.request('api/v1/data/my-provider/drillstrings.average-invokes/', {
      method: 'POST',
      json: [
        {
          timestamp: Date.now() / 1000,
          company_id: 42,
          asset_id: event.asset_id,
          version: 1,
          data: { average },
        },
      ],
    });
  },
  {
    filteringMode: FilteringMode.Timestamp,
    swallowErrors: false,
  },
);
