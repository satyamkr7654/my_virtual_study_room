import { renderHook, act, waitFor } from '@testing-library/react';
import roomApi from '../api/room.api';
import useChat from './useChat';

const user = { id: 'me', username: 'meera' };

// A socket whose answers the test controls
const fakeSocket = () => {
  const handlers = {};
  const socket = {
    connected: true,
    sent: [],
    on: (event, handler) => { handlers[event] = handler; },
    off: () => {},
    timeout: () => socket,
    emit: (event, data, ack) => socket.sent.push({ data, ack }),
    receive: (message) => act(() => handlers['chat-message'](message)),
  };
  return socket;
};
const saved = (id, extra) => ({ id, userId: 'me', username: 'meera', content: 'hi', clientId: null, ...extra });

const setup = async (history = []) => {
  vi.spyOn(roomApi, 'getMessages').mockResolvedValue({ messages: history, hasMore: false });
  const socket = fakeSocket();
  const view = renderHook(({ joined }) => useChat(socket, joined, 'room', user), { initialProps: { joined: true } });
  await waitFor(() => expect(view.result.current.messages).toHaveLength(history.length));
  return { socket, ...view };
};

it('loads history', async () => {
  const { result } = await setup([saved('1'), saved('2')]);
  expect(result.current.messages.map((m) => m.id)).toEqual(['1', '2']);
});

it('shows a sent message once, however the server confirms it', async () => {
  const { socket, result } = await setup();
  act(() => result.current.sendMessage('hi'));
  expect(result.current.messages[0].id).toBeUndefined();

  const { data, ack } = socket.sent[0];
  const message = saved('1', { clientId: data.clientId });
  socket.receive(message);
  act(() => ack(null, { ok: true, data: message }));
  expect(result.current.messages).toHaveLength(1);
  expect(result.current.messages[0].id).toBe('1');
});

it('keeps two identical messages apart', async () => {
  const { socket, result } = await setup();
  act(() => result.current.sendMessage('ok'));
  act(() => result.current.sendMessage('ok'));
  socket.sent.forEach(({ data }, i) => socket.receive(saved(String(i), { clientId: data.clientId })));
  expect(result.current.messages).toHaveLength(2);
});

it('marks a failed message and retries it with the same ID', async () => {
  const { socket, result } = await setup();
  act(() => result.current.sendMessage('hi'));
  act(() => socket.sent[0].ack(new Error('timeout')));
  expect(result.current.messages[0].failed).toBe('No response from server');

  act(() => result.current.retry(result.current.messages[0]));
  expect(result.current.messages[0].failed).toBeUndefined();
  expect(socket.sent[1].data.clientId).toBe(socket.sent[0].data.clientId);
});

it('does not send while offline', async () => {
  const { socket, result } = await setup();
  socket.connected = false;
  act(() => result.current.sendMessage('hi'));
  expect(socket.sent).toHaveLength(0);
  expect(result.current.messages[0].failed).toBe('You are offline');
});

it('fetches missed messages after a reconnect', async () => {
  const { result, rerender } = await setup([saved('1')]);
  roomApi.getMessages.mockResolvedValue({ messages: [saved('1'), saved('2')], hasMore: false });
  rerender({ joined: false });
  rerender({ joined: true });
  await waitFor(() => expect(result.current.messages).toHaveLength(2));
});
