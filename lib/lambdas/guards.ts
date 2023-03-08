import { TaskLambdaEvent, Task, ScheduledLambdaEvent, HandlerPayload, StreamLambdaEvent } from './interfaces';

export const isTask = (event: TaskLambdaEvent | Task): event is Task => Boolean((event as Task)?.id);

export const isStreamEvent = (event: HandlerPayload<unknown, unknown>): event is StreamLambdaEvent<unknown> =>
  Boolean((event as StreamLambdaEvent<unknown>).app_stream_id);

export const isScheduledEvent = (event: HandlerPayload<unknown, unknown>): event is ScheduledLambdaEvent =>
  Boolean((event as ScheduledLambdaEvent).cron_string);
