import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'

import { GeneralError } from '../general-error'
import { NotFoundError } from '../not-found-error'
import { UnauthorisedError } from '../unauthorized-error'

it.each([401, 403, 404, 429, 500, 502, 503, 504])(
  'uses Roark branding and recovery controls for %s',
  async (code) => {
    const root = createRootRoute()
    const error = createRoute({
      getParentRoute: () => root,
      path: '/error',
      component: () => <GeneralError error={{ response: { status: code } }} />,
    })
    const router = createRouter({
      routeTree: root.addChildren([error]),
      history: createMemoryHistory({ initialEntries: ['/error'] }),
    })
    await router.load()
    render(<RouterProvider router={router} />)
    expect(
      await screen.findByRole('heading', { level: 1, name: String(code) })
    ).toBeVisible()
    expect(screen.getByRole('link', { name: 'Roark API' })).toHaveAttribute(
      'href',
      '/'
    )
    expect(screen.getByText(/RoarkAPI/)).toBeVisible()
    expect(
      screen.queryByText(/GitHub Issues|Oops!|QuantumNous/)
    ).not.toBeInTheDocument()
    expect(
      screen
        .getAllByRole('link')
        .every(
          (link) => !link.getAttribute('href')?.startsWith('https://github.com')
        )
    ).toBe(true)
    if (code >= 500 || code === 429) {
      expect(screen.getByRole('button', { name: 'Refresh page' })).toBeEnabled()
    }
  }
)

it('lets an unauthenticated visitor sign in and a lost visitor return home', async () => {
  const user = userEvent.setup()
  const root = createRootRoute()
  const unauthorized = createRoute({
    getParentRoute: () => root,
    path: '/401',
    component: UnauthorisedError,
  })
  const lost = createRoute({
    getParentRoute: () => root,
    path: '/404',
    component: NotFoundError,
  })
  const signIn = createRoute({
    getParentRoute: () => root,
    path: '/sign-in',
    component: () => <h1>Sign in destination</h1>,
  })
  const home = createRoute({
    getParentRoute: () => root,
    path: '/',
    component: () => <h1>Home destination</h1>,
  })
  const router = createRouter({
    routeTree: root.addChildren([unauthorized, lost, signIn, home]),
    history: createMemoryHistory({ initialEntries: ['/401'] }),
  })
  await router.load()
  render(<RouterProvider router={router} />)
  await user.click(
    await screen.findByRole('link', { name: 'Sign in' })
  )
  expect(
    await screen.findByRole('heading', { name: 'Sign in destination' })
  ).toBeVisible()
  await router.navigate({ to: '/404' })
  await user.click(await screen.findByRole('link', { name: 'Beam me home' }))
  expect(
    await screen.findByRole('heading', { name: 'Home destination' })
  ).toBeVisible()
})

it('shows the branded error boundary when a real route fails to load', async () => {
  const root = createRootRoute({ errorComponent: GeneralError })
  const broken = createRoute({
    getParentRoute: () => root,
    path: '/sign-up',
    beforeLoad: () => {
      throw new Error('Loading chunk 8622 failed')
    },
    component: () => <h1>Registration form</h1>,
  })
  const router = createRouter({
    routeTree: root.addChildren([broken]),
    history: createMemoryHistory({ initialEntries: ['/sign-up'] }),
  })
  await router.load()
  render(<RouterProvider router={router} />)
  await waitFor(() =>
    expect(screen.getByRole('heading', { name: '500' })).toBeVisible()
  )
  expect(
    screen.getByRole('heading', { name: 'We lost the signal.' })
  ).toBeVisible()
  expect(screen.getByRole('link', { name: 'Roark API' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Refresh page' })).toBeEnabled()
  expect(screen.queryByText(/Loading chunk/)).not.toBeInTheDocument()
})
