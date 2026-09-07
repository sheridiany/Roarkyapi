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
import {
  AiChipIcon,
  ArrowUpDownIcon,
  Delete02Icon,
  SentIcon,
  StopIcon,
  Tick02Icon,
  Layers01Icon,
  Analytics01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  ComputerIcon,
  CreditCardIcon,
  DashboardSquare01Icon,
  DashboardSquare02Icon,
  File02Icon,
  AiBrain01Icon,
  Globe02Icon,
  Key01Icon,
  LanguageSquareIcon,
  Logout01Icon,
  Megaphone01Icon,
  Menu01Icon,
  Moon02Icon,
  Notification02Icon,
  PackageIcon,
  Plug01Icon,
  Radio01Icon,
  ServerStack01Icon,
  Settings01Icon,
  Shield01Icon,
  ShieldEnergyIcon,
  Sun03Icon,
  Task01Icon,
  Ticket01Icon,
  UserGroupIcon,
  UserIcon,
  Wallet01Icon,
  Wrench01Icon,
} from '@hugeicons/core-free-icons'
import {
  HugeiconsIcon,
  type HugeiconsProps,
  type IconSvgElement,
} from '@hugeicons/react'

// Bind navigation data to Hugeicons while keeping the SVG props used by menus.
function createNavigationIcon(icon: IconSvgElement) {
  return function (props: Omit<HugeiconsProps, 'icon'>) {
    return (
      <HugeiconsIcon
        icon={icon}
        size={24}
        strokeWidth={1.8}
        aria-hidden='true'
        {...props}
      />
    )
  }
}

export const Activity = createNavigationIcon(Analytics01Icon)
export const Bell = createNavigationIcon(Notification02Icon)
export const Box = createNavigationIcon(PackageIcon)
export const ChevronLeft = createNavigationIcon(ArrowLeft01Icon)
export const ChevronRight = createNavigationIcon(ArrowRight01Icon)
export const CreditCard = createNavigationIcon(CreditCardIcon)
export const FileText = createNavigationIcon(File02Icon)
export const Globe = createNavigationIcon(Globe02Icon)
export const Key = createNavigationIcon(Key01Icon)
export const Languages = createNavigationIcon(LanguageSquareIcon)
export const Layout = createNavigationIcon(DashboardSquare02Icon)
export const LayoutDashboard = createNavigationIcon(DashboardSquare01Icon)
export const ListTodo = createNavigationIcon(Task01Icon)
export const LogOut = createNavigationIcon(Logout01Icon)
export const Megaphone = createNavigationIcon(Megaphone01Icon)
export const Menu = createNavigationIcon(Menu01Icon)
export const Monitor = createNavigationIcon(ComputerIcon)
export const Moon = createNavigationIcon(Moon02Icon)
export const MoonStar = createNavigationIcon(Moon02Icon)
export const PlugZap = createNavigationIcon(Plug01Icon)
export const Radio = createNavigationIcon(Radio01Icon)
export const ServerCog = createNavigationIcon(ServerStack01Icon)
export const Settings = createNavigationIcon(Settings01Icon)
export const Shield = createNavigationIcon(Shield01Icon)
export const ShieldAlert = createNavigationIcon(ShieldEnergyIcon)
export const Sun = createNavigationIcon(Sun03Icon)
export const Ticket = createNavigationIcon(Ticket01Icon)
export const User = createNavigationIcon(UserIcon)
export const Users = createNavigationIcon(UserGroupIcon)
export const Wallet = createNavigationIcon(Wallet01Icon)
export const Wrench = createNavigationIcon(Wrench01Icon)
export const X = createNavigationIcon(Cancel01Icon)

export const ModelTest = createNavigationIcon(AiBrain01Icon)

export const Cpu = createNavigationIcon(AiChipIcon)
export const ChevronsUpDown = createNavigationIcon(ArrowUpDownIcon)
export const Trash = createNavigationIcon(Delete02Icon)
export const Send = createNavigationIcon(SentIcon)
export const Stop = createNavigationIcon(StopIcon)
export const Check = createNavigationIcon(Tick02Icon)
export const Layers = createNavigationIcon(Layers01Icon)
