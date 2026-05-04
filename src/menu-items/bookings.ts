import {
  BookOutlined, CarOutlined, HomeOutlined, InsuranceOutlined,
} from '@ant-design/icons';
import { PERMISSIONS } from '../constants/permissions';

const BookingPages = {
  id: 'bookings-group',
  title: 'Travel & Bookings',
  type: 'group',
  children: [
    {
      id: 'bookings',
      title: 'All Bookings',
      type: 'item',
      url: '/bookings',
      icon: BookOutlined,
      permission: PERMISSIONS.BOOKINGS_VIEW,
    },
    {
      id: 'flights',
      title: 'Flights',
      type: 'item',
      url: '/flights',
      icon: CarOutlined,
      permission: PERMISSIONS.BOOKINGS_VIEW,
    },
    {
      id: 'hotels',
      title: 'Hotels',
      type: 'item',
      url: '/hotels',
      icon: HomeOutlined,
      permission: PERMISSIONS.BOOKINGS_VIEW,
    },
    {
      id: 'insurance',
      title: 'Insurance',
      type: 'item',
      url: '/insurance',
      icon: InsuranceOutlined,
      permission: PERMISSIONS.BOOKINGS_VIEW,
    },
  ],
};

export default BookingPages;