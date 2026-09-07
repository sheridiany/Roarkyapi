import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { SectionPageLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { api } from '@/lib/api'

interface Invitation {
  id: number
  code_prefix: string
  name: string
  status: number
  expires_at: number
  used_user_id: number
  used_at: number
}
interface CreatedInvitation extends Invitation {
  code: string
}
interface Result<T> {
  success: boolean
  message?: string
  data: T
}
const queryKey = ['registration-invitations']
const schema = z.object({
  name: z.string().max(100),
  count: z.number().int().min(1).max(50),
  valid_days: z.number().int().min(1).max(30),
})
type FormValues = z.infer<typeof schema>

export function RegistrationInvitations() {
  const { t } = useTranslation()
  const client = useQueryClient()
  const [page, setPage] = useState(1)
  const [created, setCreated] = useState<CreatedInvitation[]>([])
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', count: 1, valid_days: 7 },
  })
  const invitations = useQuery({
    queryKey: [...queryKey, page],
    queryFn: async () => {
      const { data } = await api.get<
        Result<{ items: Invitation[]; total: number }>
      >('/api/registration-invitations/', { params: { page } })
      if (!data.success) {
        throw new Error(data.message || t('Failed to load invitation codes'))
      }
      return data.data
    },
  })
  const generate = useMutation({
    mutationFn: async (values: FormValues) => {
      const { data } = await api.post<Result<CreatedInvitation[]>>(
        '/api/registration-invitations/',
        values
      )
      if (!data.success) {
        throw new Error(data.message || t('Failed to create invitation codes'))
      }
      return data.data
    },
    onSuccess: (rows) => {
      setCreated(rows)
      setPage(1)
      void client.invalidateQueries({ queryKey })
      toast.success(t('Invitation codes created'))
    },
  })
  const revoke = useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<Result<null>>(
        `/api/registration-invitations/${id}`
      )
      if (!data.success) {
        throw new Error(data.message || t('Failed to revoke invitation code'))
      }
    },
    onSuccess: (_, id) => {
      setCreated((rows) => rows.filter((row) => row.id !== id))
      void client.invalidateQueries({ queryKey })
      toast.success(t('Invitation code revoked'))
    },
  })
  async function copyInvitations(asLinks = true) {
    try {
      await navigator.clipboard.writeText(
        created
          .map((row) =>
            asLinks
              ? `${window.location.origin}/sign-up#invite=${row.code}`
              : row.code
          )
          .join('\n')
      )
      toast.success(
        asLinks ? t('Invitation links copied') : t('Invitation codes copied')
      )
    } catch {
      toast.error(
        t('Unable to copy. Please select and copy the invitation link.')
      )
    }
  }
  const total = invitations.data?.total ?? 0
  const now = Date.now() / 1000
  return (
    <SectionPageLayout
      description={t(
        'Each invitation can create one account. Used, expired, and revoked codes cannot be reused.'
      )}
    >
      <SectionPageLayout.Title>
        {t('Registration invitations')}
      </SectionPageLayout.Title>
      <SectionPageLayout.Content>
        <div className='grid gap-5 pb-6'>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) => generate.mutate(values))}
              className='grid items-start gap-4 rounded-lg border p-4 sm:grid-cols-3'
            >
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Note')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        maxLength={100}
                        placeholder={t('Optional note for these invitations')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='count'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Number of invitations')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type='number'
                        min={1}
                        max={50}
                        onChange={(event) =>
                          field.onChange(Number(event.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='valid_days'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Validity in days')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type='number'
                        min={1}
                        max={30}
                        onChange={(event) =>
                          field.onChange(Number(event.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className='sm:col-span-3'>
                <Button type='submit' disabled={generate.isPending}>
                  {t('Generate invitation codes')}
                </Button>
              </div>
            </form>
          </Form>
          {created.length > 0 && (
            <section
              className='grid gap-3 rounded-lg border p-4'
              aria-label={t('New invitation links')}
            >
              <p className='text-sm'>
                {t(
                  'Save these links now. Complete invitation codes are shown only once.'
                )}
              </p>
              {created.map((row) => (
                <Input
                  key={row.id}
                  aria-label={t('Invitation link')}
                  readOnly
                  value={`${window.location.origin}/sign-up#invite=${row.code}`}
                  onFocus={(event) => event.target.select()}
                />
              ))}
              <Button
                variant='outline'
                className='w-fit'
                onClick={() => void copyInvitations()}
              >
                {t('Copy invitation links')}
              </Button>
              <Button
                variant='outline'
                className='w-fit'
                onClick={() => void copyInvitations(false)}
              >
                {t('Copy invitation codes')}
              </Button>
            </section>
          )}
          {invitations.isError && (
            <p role='alert'>{t('Failed to load invitation codes')}</p>
          )}
          {invitations.isPending ? (
            <p>{t('Loading...')}</p>
          ) : (
            <div className='overflow-x-auto rounded-lg border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Invitation code')}</TableHead>
                    <TableHead>{t('Note')}</TableHead>
                    <TableHead>{t('Status')}</TableHead>
                    <TableHead>{t('Expires at')}</TableHead>
                    <TableHead>{t('Used by')}</TableHead>
                    <TableHead>{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(invitations.data?.items ?? []).map((row) => {
                    let status = t('Available')
                    if (row.status === 2) status = t('Used')
                    else if (row.status === 3) status = t('Revoked')
                    else if (row.expires_at <= now) status = t('Expired')
                    return (
                      <TableRow key={row.id}>
                        <TableCell className='font-mono'>
                          {row.code_prefix}…
                        </TableCell>
                        <TableCell>{row.name || '—'}</TableCell>
                        <TableCell>{status}</TableCell>
                        <TableCell>
                          {new Date(row.expires_at * 1000).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {row.used_user_id ? `#${row.used_user_id}` : '—'}
                        </TableCell>
                        <TableCell>
                          {row.status === 1 && row.expires_at > now && (
                            <Button
                              variant='outline'
                              size='sm'
                              disabled={revoke.isPending}
                              onClick={() => revoke.mutate(row.id)}
                            >
                              {t('Revoke invitation')}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {total === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className='text-muted-foreground h-24 text-center'
                      >
                        {t('No invitation codes yet')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          <div className='flex items-center justify-end gap-3'>
            <span className='text-muted-foreground text-sm'>
              {t('Page {{page}}', { page })}
            </span>
            <Button
              variant='outline'
              disabled={page === 1}
              onClick={() => setPage((value) => value - 1)}
            >
              {t('Previous')}
            </Button>
            <Button
              variant='outline'
              disabled={page * 20 >= total}
              onClick={() => setPage((value) => value + 1)}
            >
              {t('Next')}
            </Button>
          </div>
        </div>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
