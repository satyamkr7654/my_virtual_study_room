import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { FeedbackProvider } from '../../context/FeedbackContext';
import roomApi from '../../api/room.api';
import Dashboard from './Dashboard';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'me', username: 'meera' }, logout: vi.fn() }),
}));

const rooms = [
  { _id: 'r1', name: 'Mine', code: '111111', host: { _id: 'me', username: 'meera' }, participants: [{}], online: 0 },
  { _id: 'r2', name: 'Theirs', code: '222222', host: { _id: 'x', username: 'arjun' }, participants: [{}, {}], online: 2 },
];

const renderDashboard = () => render(
  <FeedbackProvider>
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/room/:id" element={<p>Room page</p>} />
      </Routes>
    </MemoryRouter>
  </FeedbackProvider>
);

beforeEach(() => {
  vi.spyOn(roomApi, 'getAll').mockResolvedValue({ rooms });
});

it('separates hosted and joined rooms and shows who is inside', async () => {
  renderDashboard();
  expect(await screen.findByText('Hosted by you')).toBeInTheDocument();
  const theirs = screen.getByRole('link', { name: 'Theirs' }).closest('li');
  expect(theirs).toHaveTextContent('2 inside now');
  expect(theirs).toHaveTextContent('hosted by arjun');
  // Only the host gets the code and the delete button
  expect(within(theirs).getAllByRole('button')).toHaveLength(1);
  expect(within(theirs).getByRole('button', { name: 'Leave Theirs for good' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Copy room code 111111' })).toBeInTheDocument();
});

it('joins with a code, keeping digits only', async () => {
  const join = vi.spyOn(roomApi, 'join').mockResolvedValue({ room: { _id: 'r2' } });
  renderDashboard();
  await userEvent.type(screen.getByLabelText('Join with a code'), '22a22 22');
  await userEvent.click(screen.getByRole('button', { name: 'Join' }));
  expect(await screen.findByText('Room page')).toBeInTheDocument();
  expect(join).toHaveBeenCalledWith('222222');
});

it('shows why joining failed', async () => {
  vi.spyOn(roomApi, 'join').mockRejectedValue({ response: { data: { error: 'Room not found' } } });
  renderDashboard();
  await userEvent.type(screen.getByLabelText('Join with a code'), '999999');
  await userEvent.click(screen.getByRole('button', { name: 'Join' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Room not found');
});

it('asks before deleting', async () => {
  const remove = vi.spyOn(roomApi, 'delete').mockResolvedValue({});
  renderDashboard();
  await userEvent.click(await screen.findByRole('button', { name: 'Delete Mine' }));
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(remove).not.toHaveBeenCalled();

  await userEvent.click(screen.getByRole('button', { name: 'Delete Mine' }));
  await userEvent.click(screen.getByRole('button', { name: 'Delete room' }));
  await waitFor(() => expect(screen.queryByRole('link', { name: 'Mine' })).toBeNull());
  expect(remove).toHaveBeenCalledWith('r1');
});

it('removes a joined room after confirming', async () => {
  const leave = vi.spyOn(roomApi, 'leave').mockResolvedValue();
  renderDashboard();
  await userEvent.click(await screen.findByRole('button', { name: 'Leave Theirs for good' }));
  await userEvent.click(screen.getByRole('button', { name: 'Leave room' }));
  await waitFor(() => expect(screen.queryByRole('link', { name: 'Theirs' })).toBeNull());
  expect(leave).toHaveBeenCalledWith('r2');
});

it('offers to try again when loading fails', async () => {
  roomApi.getAll.mockRejectedValueOnce({ request: {} });
  renderDashboard();
  expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server');
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByRole('link', { name: 'Mine' })).toBeInTheDocument();
});
