/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterAll, beforeAll, afterEach, beforeEach, expect, test, vi } from 'vitest'

import { useNotifications } from '@/hooks/use-notifications'
import { useNotificationStore } from '@/stores/notification-store'

import { NotificationPopover } from '../notification-popover'

const originalGetAnimations = Object.getOwnPropertyDescriptor(Element.prototype, 'getAnimations')
beforeAll(() => {
  Object.defineProperty(Element.prototype, 'getAnimations', { configurable: true, value: () => [] })
})
afterAll(() => {
  if (originalGetAnimations) Object.defineProperty(Element.prototype, 'getAnimations', originalGetAnimations)
  else Reflect.deleteProperty(Element.prototype, 'getAnimations')
})

let client: QueryClient
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  useNotificationStore.setState({
    readAnnouncementKeys: [],
    lastReadNotice: '',
  })
})
afterEach(() => {
  client.clear()
  useNotificationStore.setState({
    readAnnouncementKeys: [],
    lastReadNotice: '',
  })
  localStorage.removeItem('notification-storage')
})
function NotificationCenter() {
  const notifications = useNotifications()
  return (
    <NotificationPopover
      open={notifications.popoverOpen}
      onOpenChange={notifications.setPopoverOpen}
      unreadCount={notifications.unreadCount}
      announcements={notifications.announcements}
      loading={notifications.loading}
    />
  )
}
test('notification center shows timeline directly and opening it clears its unread count', async () => {
  client.setQueryData(['status'], {
    announcements_enabled: true,
    announcements: [
      {
        id: 42,
        content: 'Service updated',
        publishDate: '2026-09-05T12:00:00Z',
      },
    ],
  })
  render(
    <QueryClientProvider client={client}>
      <NotificationCenter />
    </QueryClientProvider>
  )
  const trigger = screen.getByRole('button', { name: 'Notifications' })
  expect(trigger).toHaveTextContent('1')
  fireEvent.click(trigger)
  expect(await screen.findByText('Service updated')).toBeVisible()
  expect(screen.getByText('Notifications')).toBeVisible()
  expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  expect(screen.queryByText('System Announcements')).not.toBeInTheDocument()
  await waitFor(() => expect(trigger).not.toHaveTextContent('1'))
  expect(useNotificationStore.getState().readAnnouncementKeys).toContain(
    'id:42'
  )
  fireEvent.click(screen.getByRole('button', { name: 'Close' }))
  await waitFor(() =>
    expect(screen.queryByText('Service updated')).not.toBeInTheDocument()
  )
})
test('disabled timeline has no unread badge and opens the notification empty state', async () => {
  client.setQueryData(['status'], {
    announcements_enabled: false,
    announcements: [{ id: 42, content: 'Hidden update' }],
  })
  client.setQueryData(['notice'], { success: true, data: 'Legacy notice' })
  render(
    <QueryClientProvider client={client}>
      <NotificationCenter />
    </QueryClientProvider>
  )
  const trigger = screen.getByRole('button', { name: 'Notifications' })
  expect(trigger).not.toHaveTextContent('1')
  fireEvent.click(trigger)
  expect(await screen.findByText('No notifications')).toBeVisible()
  expect(screen.queryByText('Legacy notice')).not.toBeInTheDocument()
  expect(screen.queryByText('Hidden update')).not.toBeInTheDocument()
})
test('loading timeline shows a loading state without tabs', async () => {
  render(
    <NotificationPopover
      open
      onOpenChange={vi.fn()}
      unreadCount={0}
      announcements={[]}
      loading
    />
  )
  expect(await screen.findByText('Loading...')).toBeVisible()
  expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
})
