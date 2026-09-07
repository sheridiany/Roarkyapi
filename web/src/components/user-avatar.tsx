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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  getUserAvatarFallback,
  getUserAvatarSrc,
  getUserAvatarStyle,
} from '@/lib/avatar'
import { cn } from '@/lib/utils'

interface UserAvatarProps {
  name: string
  className?: string
  masked?: boolean
}

export function UserAvatar(props: UserAvatarProps) {
  return (
    <Avatar
      className={cn('rounded-[20%] after:rounded-[inherit]', props.className)}
    >
      {!props.masked && (
        <AvatarImage
          src={getUserAvatarSrc(props.name)}
          alt={props.name}
          className='rounded-[inherit]'
        />
      )}
      <AvatarFallback
        className='rounded-[inherit] text-xs font-semibold'
        style={props.masked ? undefined : getUserAvatarStyle(props.name)}
      >
        {props.masked ? '•' : getUserAvatarFallback(props.name)}
      </AvatarFallback>
    </Avatar>
  )
}
